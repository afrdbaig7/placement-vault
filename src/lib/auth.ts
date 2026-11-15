import "server-only";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { isMod } from "@/data/config";
import type { User } from "@prisma/client";

export class ApiError extends Error {
  status: number;
  headers?: Record<string, string>;
  constructor(status: number, message: string, headers?: Record<string, string>) {
    super(message);
    this.status = status;
    this.headers = headers;
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: err.message },
      { status: err.status, headers: err.headers }
    );
  }
  console.error("[api]", err);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}

export async function getCurrentUser(): Promise<User | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await db.user.findUnique({ where: { id: userId } });
  return user ?? null;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Sign in with Google to continue");
  return user;
}

/** Actions that earn or spend coins need a mod-verified roll number (or mod/admin role). */
export async function requireVerified(): Promise<User> {
  const user = await requireUser();
  if (!user.rollVerified && !isMod(user.role)) {
    throw new ApiError(403, "A moderator must verify your roll number before you can earn or spend coins");
  }
  return user;
}

export async function requireMod(): Promise<User> {
  const user = await requireUser();
  if (!isMod(user.role)) throw new ApiError(403, "Moderator access required");
  return user;
}

export function publicUser(u: User) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    image: u.image,
    role: u.role,
    rollNumber: u.rollNumber,
    rollVerified: u.rollVerified,
    placedCompany: u.placedCompany,
    batch: u.batch,
    createdAt: u.createdAt,
  };
}

export type PublicUser = ReturnType<typeof publicUser>;
