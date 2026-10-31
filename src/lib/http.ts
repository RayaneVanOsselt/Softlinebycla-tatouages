import { NextResponse } from "next/server";

export const json = (body: unknown, status = 200, headers?: Record<string, string>) =>
  NextResponse.json(body, { status, headers: { "cache-control": "no-store", ...headers } });
