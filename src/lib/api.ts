"use client";

// Tiny typed fetch wrapper with automatic CSRF header injection.

export class ApiClientError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let cachedCsrfToken: string | null = null;
let csrfInflight: Promise<string> | null = null;

export function setCsrfToken(token: string | undefined) {
  if (token) cachedCsrfToken = token;
}

async function ensureCsrfToken(): Promise<string> {
  if (cachedCsrfToken) return cachedCsrfToken;
  if (!csrfInflight) {
    csrfInflight = fetch("/api/auth/csrf", { credentials: "same-origin" })
      .then((res) => res.json() as Promise<{ csrfToken?: string }>)
      .then((data) => {
        if (!data.csrfToken) throw new Error("Missing CSRF token");
        cachedCsrfToken = data.csrfToken;
        return data.csrfToken;
      })
      .finally(() => {
        csrfInflight = null;
      });
  }
  return csrfInflight;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const isMutation = !["GET", "HEAD", "OPTIONS"].includes(method);

  const send = async (token?: string) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((init?.headers as Record<string, string>) ?? {}),
    };
    if (isMutation && token) {
      headers["x-csrf-token"] = token;
    }
    return fetch(path, {
      ...init,
      credentials: "same-origin",
      headers,
    });
  };

  let token = isMutation ? await ensureCsrfToken() : undefined;
  let res = await send(token);

  // If the CSRF cookie rotated/expired, refresh once and retry
  if (isMutation && res.status === 403) {
    cachedCsrfToken = null;
    token = await ensureCsrfToken();
    res = await send(token);
  }

  const data = (await res.json().catch(() => ({}))) as T & { error?: string; csrfToken?: string };
  if (typeof data.csrfToken === "string") {
    cachedCsrfToken = data.csrfToken;
  }

  if (!res.ok) {
    throw new ApiClientError(res.status, data.error ?? `Request failed (${res.status})`);
  }
  return data;
}

export const post = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) });
