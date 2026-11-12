export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  level: LogLevel;
  message: string;
  context?: string;
  meta?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  timestamp: string;
}

const IS_PROD = process.env.NODE_ENV === "production";

function formatError(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: IS_PROD ? undefined : err.stack,
    };
  }
  if (typeof err === "string") {
    return { name: "Error", message: err };
  }
  return { name: "UnknownError", message: String(err) };
}

function emitLog(level: LogLevel, message: string, meta?: Record<string, unknown>, context?: string) {
  const payload: LogPayload = {
    level,
    message,
    context,
    meta,
    timestamp: new Date().toISOString(),
  };

  if (meta?.error) {
    payload.error = formatError(meta.error);
    const { error: _err, ...rest } = meta;
    payload.meta = rest;
  }

  if (IS_PROD) {
    const json = JSON.stringify(payload);
    if (level === "error") {
      console.error(json);
    } else if (level === "warn") {
      console.warn(json);
    } else {
      console.log(json);
    }
  } else {
    const prefix = `[${payload.timestamp.slice(11, 19)}] [${level.toUpperCase()}]${context ? ` [${context}]` : ""}`;
    const extra = payload.meta && Object.keys(payload.meta).length > 0 ? payload.meta : "";
    if (level === "error") {
      console.error(prefix, message, extra, payload.error ? `\n${payload.error.stack || payload.error.message}` : "");
    } else if (level === "warn") {
      console.warn(prefix, message, extra);
    } else {
      console.log(prefix, message, extra);
    }
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>, context?: string) => {
    if (process.env.DEBUG || !IS_PROD) {
      emitLog("debug", message, meta, context);
    }
  },
  info: (message: string, meta?: Record<string, unknown>, context?: string) => {
    emitLog("info", message, meta, context);
  },
  warn: (message: string, meta?: Record<string, unknown>, context?: string) => {
    emitLog("warn", message, meta, context);
  },
  error: (message: string, meta?: Record<string, unknown>, context?: string) => {
    emitLog("error", message, meta, context);
  },
  child: (context: string) => ({
    debug: (message: string, meta?: Record<string, unknown>) => logger.debug(message, meta, context),
    info: (message: string, meta?: Record<string, unknown>) => logger.info(message, meta, context),
    warn: (message: string, meta?: Record<string, unknown>) => logger.warn(message, meta, context),
    error: (message: string, meta?: Record<string, unknown>) => logger.error(message, meta, context),
  }),
};
