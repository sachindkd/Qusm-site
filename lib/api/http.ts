import { NextResponse } from "next/server";

export function jsonError(message: string, status = 500, details?: unknown) {
  const body: { error: string; details?: unknown } = { error: message };
  if (process.env.NODE_ENV !== "production" && details !== undefined) body.details = details;
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function parseId(value: string | null) {
  const id = value?.trim() ?? "";
  if (!id || id.length > 128 || /[^a-zA-Z0-9_\-:.]/.test(id)) return null;
  return id;
}

export function requireMethod(request: Request, allowed: string[]) {
  return allowed.includes(request.method.toUpperCase());
}
