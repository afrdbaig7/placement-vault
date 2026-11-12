import { createServer } from "http";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Server, type Socket } from "socket.io";
import { Database } from "bun:sqlite";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";

const PORT = Number(process.env.CHAT_PORT || 3004);
const NEXT_AUTH_URL = process.env.NEXT_AUTH_URL || "http://localhost:3000";
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

type ChatUser = { id: string; name: string; role: string };

/**
 * Authenticates user via Next.js internal auth API endpoint instead of reading an SQLite file.
 * This supports distributed multi-host deployments and hosted database clusters.
 */
async function lookupUserViaApi(cookieHeader: string): Promise<ChatUser | null> {
  try {
    const res = await fetch(`${NEXT_AUTH_URL}/api/auth/session`, {
      headers: { cookie: cookieHeader },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: { id: string; name: string; role: string } };
    if (!data.user) return null;
    return { id: data.user.id, name: data.user.name, role: data.user.role };
  } catch {
    return null;
  }
}

async function authenticateHandshakeAsync(socket: Socket): Promise<ChatUser | null> {
  // 1. Signed WS auth token path (stateless, zero DB hits)
  const rawToken =
    typeof socket.handshake.auth?.token === "string" ? socket.handshake.auth.token : undefined;
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
    const role =
      payload.role && ["STUDENT", "SENIOR", "MOD", "ADMIN"].includes(payload.role)
        ? payload.role
        : "STUDENT";
    return { id: String(payload.sub).slice(0, 64), name, role };
  }

  // 2. Cookie session fallback via Next.js API
  const cookieHeader = socket.handshake.headers.cookie;
  if (cookieHeader && cookieHeader.includes("cph_session")) {
    const user = await lookupUserViaApi(cookieHeader);
    if (user) return user;
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

/** ---------- persistence (SQLite for ephemeral chat messages) ---------- */
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
    .query(
      "SELECT id, channel, user_id AS userId, name, role, content, created_at AS createdAt FROM messages WHERE channel = ? ORDER BY created_at DESC LIMIT ?"
    )
    .all(channel, HISTORY_LIMIT)
    .reverse();
}

function saveMessage(m: {
  id: string;
  channel: string;
  userId: string;
  name: string;
  role: string;
  content: string;
  createdAt: string;
}) {
  db.query(
    "INSERT INTO messages (id, channel, user_id, name, role, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(m.id, m.channel, m.userId, m.name, m.role, m.content, m.createdAt);
}

/** ---------- server ---------- */
const allowedOrigins = (process.env.CHAT_ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "healthy",
        service: "chat-service",
        timestamp: new Date().toISOString(),
      })
    );
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, {
  path: "/chat/socket.io",
  maxHttpBufferSize: 16_384,
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Redis adapter for horizontal scaling across multiple chat service instances
if (process.env.REDIS_URL) {
  try {
    const pubClient = new Redis(process.env.REDIS_URL);
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    console.log(`[Chat Service] Attached Redis adapter to ${process.env.REDIS_URL}`);
  } catch (err) {
    console.warn("[Chat Service] Failed to attach Redis adapter, running in single-node mode:", err);
  }
}

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
  const name = raw
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 60);
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

io.use(async (socket, next) => {
  try {
    socket.data.user = await authenticateHandshakeAsync(socket);
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
      const until = Date.now() + TYPING_TTL_MS;
      let m = typingUntil.get(channel);
      if (!m) {
        m = new Map();
        typingUntil.set(channel, m);
      }
      m.set(socket.id, until);
      socket.to(channel).emit("chat:typing", {
        channel,
        name: authUser.name,
        socketId: socket.id,
        typing: true,
      });
    } else {
      clearTyping(socket, channel);
    }
  });

  socket.on("disconnect", () => {
    const ch = currentChannel.get(socket.id);
    if (ch) {
      getPresenceMap(ch).delete(socket.id);
      clearTyping(socket, ch);
      broadcastPresence(ch);
    }
    currentChannel.delete(socket.id);
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [ch, m] of typingUntil.entries()) {
    for (const [sid, until] of m.entries()) {
      if (now > until) {
        m.delete(sid);
        io.to(ch).emit("chat:typing", { channel: ch, name: null, socketId: sid, typing: false });
      }
    }
    if (m.size === 0) typingUntil.delete(ch);
  }
}, 2000);

httpServer.listen(PORT, () => {
  console.log(`[Chat Service] Running on port ${PORT} (Next auth: ${NEXT_AUTH_URL})`);
});
