import type { Hono } from "hono";

declare global {
  // eslint-disable-next-line no-var
  var __testApp: Hono | undefined;
}

function getApp(): Hono {
  if (!globalThis.__testApp) {
    throw new Error("Test app not initialized — bun test preload missing?");
  }
  return globalThis.__testApp;
}

export async function jsonRequest<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<{ res: Response; json: T }> {
  const res = await getApp().fetch(new Request(`http://localhost${path}`, init));
  const text = await res.text();
  let json: T;
  try {
    json = text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    throw new Error(`Non-JSON response (${res.status}): ${text}`);
  }
  return { res, json };
}

export function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}
