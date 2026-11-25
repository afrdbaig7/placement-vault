"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Hash,
  MessagesSquare,
  Send,
  Wifi,
  WifiOff,
  GraduationCap,
  Briefcase,
  PenLine,
  Coffee,
  HandCoins,
} from "lucide-react";

type ChatMessage = {
  id: string;
  channel: string;
  userId: string;
  name: string;
  role: string;
  content: string;
  createdAt: string;
};

type ChannelDef = { slug: string; name: string; description: string };
type PresenceData = { channel: string; count: number; names: string[] };

const CHANNEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  general: GraduationCap,
  "interview-help": PenLine,
  "aptitude-verbal": Briefcase,
  referrals: HandCoins,
  "off-topic": Coffee,
};

const CHANNELS: ChannelDef[] = [
  { slug: "general", name: "General", description: "Intros, timelines, general questions" },
  { slug: "interview-help", name: "Interview help", description: "Live help for DSA and rounds" },
  { slug: "aptitude-verbal", name: "Aptitude & verbal", description: "Quant, reasoning, CS-core" },
  { slug: "referrals", name: "Referrals", description: "Openings and referral threads (sign in required)" },
  { slug: "off-topic", name: "Off topic", description: "Hostel life, memes, rants" },
];

const AVATAR_STYLES = [
  "bg-emerald-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-violet-600",
  "bg-teal-600",
  "bg-orange-600",
  "bg-cyan-700",
  "bg-lime-700",
  "bg-fuchsia-700",
  "bg-red-700",
];

function avatarStyle(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_STYLES[Math.abs(h) % AVATAR_STYLES.length];
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function resolveChatEndpoint(): string {
  if (process.env.NEXT_PUBLIC_CHAT_URL) return process.env.NEXT_PUBLIC_CHAT_URL;
  if (typeof window !== "undefined" && window.location.port === "3000") {
    return `${window.location.protocol}//${window.location.hostname}:3004`;
  }
  return "/";
}

const GROUP_WINDOW_MS = 4 * 60 * 1000;

export function ChatView() {
  const { session, setSignInOpen } = useApp();
  const user = session?.user ?? null;
  const userId = user?.id ?? null;

  const [channel, setChannel] = useState("general");
  const [history, setHistory] = useState<Record<string, ChatMessage[] | null>>({});
  const [draft, setDraft] = useState("");
  const [connected, setConnected] = useState(false);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [presence, setPresence] = useState<PresenceData | null>(null);
  const [typing, setTyping] = useState<Record<string, number>>({});

  const messages = history[channel] ?? null;

  const socketRef = useRef<Socket | null>(null);
  const channelRef = useRef(channel);
  const sessionRef = useRef(session);
  const lastTypingEmit = useRef(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    channelRef.current = channel;
    sessionRef.current = session;
  }, [channel, session]);

  const activeChannel = useMemo(() => CHANNELS.find((c) => c.slug === channel) ?? CHANNELS[0], [channel]);

  /** Socket lifecycle: re-authenticates when signed-in userId changes. */
  useEffect(() => {
    let disposed = false;
    let socket: Socket | null = null;

    async function connectSocket() {
      let wsToken: string | null = null;
      if (userId) {
        try {
          const res = await api<{ token: string | null }>("/api/chat/token");
          wsToken = res.token;
        } catch {
          wsToken = null;
        }
      }
      if (disposed) return;

      setConnectionFailed(false);
      socket = io(resolveChatEndpoint(), {
        path: "/ws/chat",
        withCredentials: true,
        auth: wsToken ? { token: wsToken } : {},
        transports: ["websocket", "polling"],
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        timeout: 10000,
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        setConnected(true);
        setConnectionFailed(false);
        socket?.emit("chat:join", { channel: channelRef.current });
      });
      socket.on("disconnect", () => setConnected(false));
      socket.io.on("reconnect_failed", () => setConnectionFailed(true));
      socket.on("connect_error", () => setConnected(false));

      socket.on("chat:history", (data: { channel: string; messages: ChatMessage[] }) => {
        setHistory((prev) => ({ ...prev, [data.channel]: data.messages }));
      });

      socket.on("chat:message", (message: ChatMessage) => {
        setHistory((prev) => {
          const list = prev[message.channel];
          if (!list || list.some((m) => m.id === message.id)) return prev;
          return { ...prev, [message.channel]: [...list, message] };
        });
        setTyping((prev) => {
          if (!(message.name in prev)) return prev;
          const next = { ...prev };
          delete next[message.name];
          return next;
        });
      });

      socket.on("chat:presence", (data: PresenceData) => {
        if (data.channel !== channelRef.current) return;
        setPresence(data);
      });

      socket.on("chat:typing", (data: { channel: string; name: string | null; socketId: string; typing: boolean }) => {
        if (data.channel !== channelRef.current) return;
        setTyping((prev) => {
          if (!data.typing || !data.name) {
            if (!(data.socketId in prev) && !data.name) return prev;
            const next = { ...prev };
            if (data.name) delete next[data.name];
            return next;
          }
          if (data.name === sessionRef.current?.user?.name) return prev;
          return { ...prev, [data.name]: Date.now() + 4000 };
        });
      });

      socket.on("chat:error", (data: { message: string }) => {
        toast.error(data.message);
      });
    }

    void connectSocket();

    const prune = setInterval(() => {
      setTyping((prev) => {
        const now = Date.now();
        const next = Object.fromEntries(Object.entries(prev).filter(([, exp]) => exp > now));
        return Object.keys(next).length === Object.keys(prev).length ? prev : next;
      });
    }, 1500);

    return () => {
      disposed = true;
      clearInterval(prune);
      socket?.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [userId]);

  /** Join channel whenever it changes while connected. */
  useEffect(() => {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit("chat:join", { channel });
    }
  }, [channel]);

  /** Auto-scroll to the newest message. */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  const send = useCallback(() => {
    const socket = socketRef.current;
    const content = draft.trim();
    if (!socket || !content) return;
    if (!sessionRef.current?.user) {
      setSignInOpen(true);
      return;
    }
    socket.emit("chat:send", {
      channel: channelRef.current,
      content,
    });
    socket.emit("chat:typing", { channel: channelRef.current, typing: false });
    setDraft("");
    lastTypingEmit.current = 0;
  }, [draft, setSignInOpen]);

  const onDraftChange = useCallback((value: string) => {
    setDraft(value);
    const socket = socketRef.current;
    if (!socket || !sessionRef.current?.user) return;
    const now = Date.now();
    if (value && now - lastTypingEmit.current > 2000) {
      lastTypingEmit.current = now;
      socket.emit("chat:typing", { channel: channelRef.current, typing: true });
    }
  }, []);

  const typingNames = Object.keys(typing);
  const canPost = Boolean(user) && connected;

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight">Campus chat</h1>
          <p className="text-sm text-muted-foreground">
            Real-time rooms to post questions and get answers from seniors and batchmates — no coins needed.
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "gap-1.5",
            connected
              ? "border-emerald-300 text-emerald-800 dark:border-emerald-800 dark:text-emerald-300"
              : connectionFailed
                ? "border-red-300 text-red-800 dark:border-red-800 dark:text-red-300"
                : "border-amber-300 text-amber-800 dark:border-amber-800 dark:text-amber-300"
          )}
        >
          {connected ? <Wifi className="h-3.5 w-3.5" aria-hidden /> : <WifiOff className="h-3.5 w-3.5" aria-hidden />}
          {connected ? "Live" : connectionFailed ? "Chat unavailable" : "Connecting…"}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[230px_1fr]">
        {/* channels — sidebar on desktop, pills on mobile */}
        <nav aria-label="Chat channels" className="hidden lg:block">
          <Card>
            <CardContent className="space-y-1 p-2">
              {CHANNELS.map((c) => {
                const Icon = CHANNEL_ICONS[c.slug] ?? Hash;
                const active = c.slug === channel;
                return (
                  <button
                    key={c.slug}
                    onClick={() => setChannel(c.slug)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-lg p-2.5 text-left transition-colors",
                      active ? "bg-primary/10" : "hover:bg-accent"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{c.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{c.description}</span>
                    </span>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </nav>
        <nav aria-label="Chat channels" className="scrollbar-thin -mx-1 flex gap-1.5 overflow-x-auto px-1 lg:hidden">
          {CHANNELS.map((c) => (
            <button
              key={c.slug}
              onClick={() => setChannel(c.slug)}
              className={cn(
                "whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition-colors",
                c.slug === channel
                  ? "bg-primary text-primary-foreground"
                  : "border text-muted-foreground hover:bg-accent"
              )}
            >
              {c.name}
            </button>
          ))}
        </nav>

        {/* chat pane */}
        <Card className="flex min-h-[32rem] flex-col">
          <CardHeader className="border-b py-3.5">
            <CardTitle className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base">
              <Hash className="h-4 w-4 text-muted-foreground" aria-hidden />
              {activeChannel.name}
              {presence && presence.count > 0 && (
                <Badge variant="secondary" className="gap-1 text-[11px] font-normal" title={presence.names.join(", ")}>
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                  {presence.count} online
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs">{activeChannel.description}</CardDescription>
          </CardHeader>

          {/* messages */}
          <CardContent className="min-h-0 flex-1 p-0">
            <div
              ref={scrollRef}
              className="scrollbar-thin h-[26rem] space-y-0.5 overflow-y-auto px-4 py-3 lg:h-[28rem]"
              role="log"
              aria-live="polite"
              aria-label={`${activeChannel.name} messages`}
            >
              {messages === null ? (
                <div className="space-y-3 pt-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-3.5 w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <MessagesSquare className="h-8 w-8 text-muted-foreground/50" aria-hidden />
                  <p className="text-sm font-medium">
                    {channel === "referrals" && !user ? "Sign in required" : "No messages yet"}
                  </p>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    {channel === "referrals" && !user
                      ? "Sign in with Google to view and participate in #referrals."
                      : "Be the first to post a question — someone usually answers within minutes."}
                  </p>
                </div>
              ) : (
                messages.map((m, i) => {
                  const prev = messages[i - 1];
                  const mine = userId !== null && m.userId === userId;
                  const grouped =
                    prev !== undefined &&
                    prev.userId === m.userId &&
                    new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_WINDOW_MS;
                  const isBot = m.role === "BOT";

                  if (isBot) {
                    return (
                      <div key={m.id} className="flex justify-center py-1.5">
                        <p className="rounded-full bg-muted px-3 py-1 text-center text-xs text-muted-foreground">
                          <GraduationCap className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                          {m.content}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div key={m.id} className={cn("flex items-end gap-2.5", mine && "flex-row-reverse")}>
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
                          avatarStyle(m.name),
                          grouped && "invisible"
                        )}
                        aria-hidden
                      >
                        {initials(m.name)}
                      </span>
                      <div className={cn("max-w-[75%] space-y-0.5", mine && "items-end text-right")}>
                        {!grouped && (
                          <p className={cn("flex items-baseline gap-1.5 text-xs", mine && "justify-end")}>
                            <span className="font-semibold">{mine ? "You" : m.name}</span>
                            {(m.role === "SENIOR" || m.role === "MOD" || m.role === "ADMIN") && (
                              <Badge variant="secondary" className="h-4 px-1.5 text-[9px] uppercase">
                                {m.role}
                              </Badge>
                            )}
                            <span className="text-muted-foreground">{timeLabel(m.createdAt)}</span>
                          </p>
                        )}
                        <p
                          className={cn(
                            "w-fit whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-snug",
                            mine
                              ? "rounded-br-sm bg-primary text-primary-foreground"
                              : "rounded-bl-sm bg-muted"
                          )}
                        >
                          {m.content}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>

          {/* typing + composer */}
          <div className="border-t px-4 py-3">
            <p className="mb-2 h-4 text-xs text-muted-foreground" aria-live="polite">
              {typingNames.length > 0 &&
                (typingNames.length === 1
                  ? `${typingNames[0]} is typing…`
                  : `${typingNames.slice(0, 2).join(" and ")}${typingNames.length > 2 ? " and others" : ""} are typing…`)}
            </p>
            {user ? (
              <div className="flex items-center gap-2">
                <Input
                  value={draft}
                  onChange={(e) => onDraftChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  onBlur={() => socketRef.current?.emit("chat:typing", { channel, typing: false })}
                  placeholder={`Message #${activeChannel.slug}`}
                  aria-label={`Message ${activeChannel.name} channel`}
                  maxLength={1000}
                  disabled={!connected}
                  className="flex-1"
                />
                <Button size="icon" onClick={send} disabled={!canPost || !draft.trim()} aria-label="Send message">
                  <Send className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/60 px-3.5 py-2.5">
                <p className="text-sm text-muted-foreground">Reading public rooms is open — sign in to post or view #referrals.</p>
                <Button size="sm" onClick={() => setSignInOpen(true)}>
                  Sign in with Google
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
