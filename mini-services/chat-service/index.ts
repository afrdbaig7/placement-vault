import { createServer } from "http";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Server, type Socket } from "socket.io";
import { Database } from "bun:sqlite";

const PORT = Number(process.env.CHAT_PORT || 3004);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HEX_64_RE = /^[0-9a-f]{64}$/;

function loadSessionSecret(): string {
  let secret = process.env.SESSION_SECRET;
  if (!secret) {
    const rootEnvPath = path.resolve(__dirname, "../../.env");
    if (fs.existsSync(rootEnvPath)) {
      const envContent = fs.readFileSync(rootEnvPath, "utf8");
      const match = envContent.match(/^SESSION_SECRET\s*=\s*"?([^"\r\n]+)"?/m);
      if (match?.[1]) secret = match[1].trim();
    }
  }
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set (and >= 32 characters) before starting chat-service"
    );
  }
  return secret;
}

const SESSION_SECRET = loadSessionSecret();

function verifySignedToken(raw: string | undefined): string | null {
  if (!raw) return null;
  const idx = raw.lastIndexOf(".");
  if (idx < 1) return null;
  const value = raw.slice(0, idx);
  const sig = raw.slice(idx + 1);
  if (!HEX_64_RE.test(sig)) return null;
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("hex");
  const sigBuf = Buffer.from(sig, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
  return value;
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 1) continue;
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  }
  return out;
}

/** ---------- main app DB (readonly user lookup for session cookies) ---------- */
function openMainDb(): Database | null {
  const candidates = [
    process.env.CHAT_MAIN_DB_PATH,
    path.resolve(__dirname, "../../db/custom.db"),
  ].filter((p): p is string => Boolean(p));

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return new Database(p, { readonly: true });
    }
  }
  return null;
}

const mainDb = openMainDb();

type ChatUser = { id: string; name: string; role: string };

function lookupUserById(userId: string): ChatUser | null {
  if (!mainDb) return null;
  const row = mainDb
    .query("SELECT id, name, role FROM User WHERE id = ? LIMIT 1")
    .get(userId) as { id: string; name: string; role: string } | null;
  if (!row) return null;
  const role = ["STUDENT", "SENIOR", "MOD", "ADMIN"].includes(row.role) ? row.role : "STUDENT";
  return { id: row.id, name: row.name, role };
}

function authenticateHandshake(socket: Socket): ChatUser | null {
  const rawToken = typeof socket.handshake.auth?.token === "string" ? socket.handshake.auth.token : undefined;
  if (rawToken) {
    const verified = verifySignedToken(rawToken);
    if (!verified || !verified.startsWith("ws:")) {
      throw new Error("Invalid chat authentication token");
    }
    const payload = JSON.parse(Buffer.from(verified.slice(3), "base64url").toString("utf8")) as {
      sub?: string;
      name?: string;
      role?: string;
      exp?: number;
    };
    if (!payload.sub || !payload.name || !payload.exp || payload.exp < Date.now()) {
      throw new Error("Expired chat authentication token");
    }
    const name = sanitizeName(payload.name);
    if (!name) throw new Error("Invalid user in token");
    const role = payload.role && ["STUDENT", "SENIOR", "MOD", "ADMIN"].includes(payload.role)
      ? payload.role
      : "STUDENT";
    return { id: String(payload.sub).slice(0, 64), name, role };
  }

  const cookies = parseCookies(socket.handshake.headers.cookie);
  const rawSession = cookies["cph_session"];
  if (rawSession) {
    const userId = verifySignedToken(rawSession);
    if (!userId) throw new Error("Invalid session cookie");
    const user = lookupUserById(userId);
    if (!user) throw new Error("Session user not found");
    return user;
  }

  return null;
}

/** ---------- channels ---------- */
type ChannelDef = { slug: string; name: string; description: string; authRequired?: boolean };
const CHANNELS: ChannelDef[] = [
  { slug: "general", name: "General", description: "Campus placement talk — intros, timelines, general questions" },
  { slug: "interview-help", name: "Interview help", description: "Stuck on a DSA problem or a round? Ask here in real time" },
  { slug: "aptitude-verbal", name: "Aptitude & verbal", description: "Quant, reasoning, verbal and CS-core for service companies" },
  { slug: "referrals", name: "Referrals", description: "Seniors share openings and referral threads", authRequired: true },
  { slug: "off-topic", name: "Off topic", description: "Everything else — hostel life, memes, rants" },
];
const CHANNEL_MAP = new Map(CHANNELS.map((c) => [c.slug, c]));

/** ---------- persistence (SQLite) ---------- */
const chatDbPath = path.resolve(__dirname, "./chat.db");
const db = new Database(chatDbPath, { create: true });
db.run("PRAGMA journal_mode = WAL;");
db.run(`CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);`);
db.run("CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel, created_at);");

const HISTORY_LIMIT = 100;
function loadHistory(channel: string) {
  return db
    .query("SELECT id, channel, user_id AS userId, name, role, content, created_at AS createdAt FROM messages WHERE channel = ? ORDER BY created_at DESC LIMIT ?")
    .all(channel, HISTORY_LIMIT)
    .reverse();
}

function saveMessage(m: { id: string; channel: string; userId: string; name: string; role: string; content: string; createdAt: string }) {
  db.query("INSERT INTO messages (id, channel, user_id, name, role, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    m.id, m.channel, m.userId, m.name, m.role, m.content, m.createdAt
  );
}

// seed a welcome message per channel the first time the service runs
const anyMessages = db.query("SELECT COUNT(*) AS n FROM messages").get() as { n: number };
if (anyMessages.n === 0) {
  for (const c of CHANNELS) {
    saveMessage({
      id: crypto.randomUUID(),
      channel: c.slug,
      userId: "bot",
      name: "Placement Hub",
      role: "BOT",
      content: `Welcome to #${c.slug}! ${c.description}. Be kind — seniors took time to answer here.`,
      createdAt: new Date().toISOString(),
    });
  }
  console.log("Seeded welcome messages for", CHANNELS.length, "channels");
}

/** ---------- server ---------- */
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  "http://localhost:3000,https://localhost:3000,https://localhost,http://localhost:81"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const httpServer = createServer();
const io = new Server(httpServer, {
  path: "/ws/chat",
  maxHttpBufferSize: 16_384,
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

type Presence = { name: string; role: string };

const presence = new Map<string, Map<string, Presence>>();
const currentChannel = new Map<string, string>();
const sendLog = new Map<string, number[]>();
const typingUntil = new Map<string, Map<string, number>>();

const RATE_WINDOW_MS = 10_000;
const RATE_MAX = 8;
const MAX_LEN = 1000;
const TYPING_TTL_MS = 4000;

function getPresenceMap(channel: string) {
  let m = presence.get(channel);
  if (!m) {
    m = new Map();
    presence.set(channel, m);
  }
  return m;
}

function presenceSnapshot(channel: string) {
  const m = getPresenceMap(channel);
  const list = [...m.values()];
  const names = [...new Set(list.map((p) => p.name))].slice(0, 20);
  return { channel, count: list.length, names };
}

function broadcastPresence(channel: string) {
  io.to(channel).emit("chat:presence", presenceSnapshot(channel));
}

function sanitizeName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim().replace(/[\x00-\x1F\x7F]/g, "").replace(/\s+/g, " ").slice(0, 60);
  return name.length >= 1 ? name : null;
}

function sanitizeMessageContent(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/[\x00-\x09\x0B-\x1F\x7F]/g, "")
    .trim();
}

function canSend(userId: string): boolean {
  const now = Date.now();
  const log = (sendLog.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (log.length >= RATE_MAX) {
    sendLog.set(userId, log);
    return false;
  }
  log.push(now);
  sendLog.set(userId, log);
  return true;
}

function clearTyping(socket: Socket, channel: string | undefined) {
  if (!channel) return;
  const m = typingUntil.get(channel);
  if (m) {
    m.delete(socket.id);
    if (m.size === 0) typingUntil.delete(channel);
  }
  socket.to(channel).emit("chat:typing", { channel, name: null, socketId: socket.id, typing: false });
}

io.use((socket, next) => {
  try {
    socket.data.user = authenticateHandshake(socket);
    next();
  } catch (err) {
    next(err instanceof Error ? err : new Error("Authentication failed"));
  }
});

io.on("connection", (socket) => {
  const authUser = (socket.data.user as ChatUser | null) ?? null;

  socket.on("chat:join", (data: { channel?: string }) => {
    const channel = typeof data?.channel === "string" ? data.channel : "general";
    const channelDef = CHANNEL_MAP.get(channel);
    if (!channelDef) {
      socket.emit("chat:error", { message: "Unknown channel" });
      return;
    }

    if (channelDef.authRequired && !authUser) {
      socket.emit("chat:error", { message: `Sign in with Google to view #${channelDef.slug}` });
      socket.emit("chat:history", { channel, messages: [] });
      socket.emit("chat:channels", { channels: CHANNELS });
      return;
    }

    const prev = currentChannel.get(socket.id);
    if (prev && prev !== channel) {
      socket.leave(prev);
      getPresenceMap(prev).delete(socket.id);
      clearTyping(socket, prev);
      broadcastPresence(prev);
    }

    currentChannel.set(socket.id, channel);
    socket.join(channel);

    const pm = getPresenceMap(channel);
    if (authUser) pm.set(socket.id, { name: authUser.name, role: authUser.role });
    broadcastPresence(channel);

    socket.emit("chat:history", { channel, messages: loadHistory(channel) });
    socket.emit("chat:channels", { channels: CHANNELS });
    socket.emit("chat:presence", presenceSnapshot(channel));
  });

  socket.on("chat:send", (data: { channel?: string; content?: string }) => {
    if (!authUser) {
      socket.emit("chat:error", { message: "Sign in with Google to post in chat" });
      return;
    }

    const channel = typeof data?.channel === "string" ? data.channel : currentChannel.get(socket.id);
    const content = sanitizeMessageContent(data?.content);
    if (!channel || !CHANNEL_MAP.has(channel)) {
      socket.emit("chat:error", { message: "Unknown channel" });
      return;
    }
    if (!content) return;
    if (content.length > MAX_LEN) {
      socket.emit("chat:error", { message: `Message too long (max ${MAX_LEN} characters)` });
      return;
    }

    if (!canSend(authUser.id)) {
      socket.emit("chat:error", { message: "Slow down — too many messages in a row" });
      return;
    }

    const message = {
      id: crypto.randomUUID(),
      channel,
      userId: authUser.id,
      name: authUser.name,
      role: authUser.role,
      content,
      createdAt: new Date().toISOString(),
    };
    saveMessage(message);
    clearTyping(socket, channel);
    io.to(channel).emit("chat:message", message);
  });

  socket.on("chat:typing", (data: { channel?: string; typing?: boolean }) => {
    if (!authUser) return;
    const channel = typeof data?.channel === "string" ? data.channel : currentChannel.get(socket.id);
    if (!channel || !CHANNEL_MAP.has(channel)) return;

    if (data?.typing) {
      let m = typingUntil.get(channel);
      if (!m) {
        m = new Map();
        typingUntil.set(channel, m);
      }
      m.set(socket.id, Date.now() + TYPING_TTL_MS);
      socket.to(channel).emit("chat:typing", { channel, name: authUser.name, socketId: socket.id, typing: true });
    } else {
      clearTyping(socket, channel);
    }
  });

  socket.on("disconnect", () => {
    const channel = currentChannel.get(socket.id);
    if (channel) {
      getPresenceMap(channel).delete(socket.id);
      clearTyping(socket, channel);
      broadcastPresence(channel);
    }
    currentChannel.delete(socket.id);
  });

  socket.on("error", (error) => {
    console.error(`socket error (${socket.id}):`, error);
  });
});

// sweep expired typing indicators
setInterval(() => {
  const now = Date.now();
  for (const [channel, m] of typingUntil) {
    for (const [socketId, until] of m) {
      if (until < now) {
        m.delete(socketId);
        io.to(channel).emit("chat:typing", { channel, name: null, socketId, typing: false });
      }
    }
    if (m.size === 0) typingUntil.delete(channel);
  }
}, 2000);

httpServer.listen(PORT, () => {
  console.log(`Chat service (socket.io) running on port ${PORT}`);
});

process.on("SIGTERM", () => {
  httpServer.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  httpServer.close(() => process.exit(0));
});
