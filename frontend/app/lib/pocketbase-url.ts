const DEFAULT_URL = "http://localhost:8090";

/** Resolve PocketBase base URL for the current environment. */
export function resolvePocketBaseUrl(configured: string | undefined): string {
  const url = configured?.trim() || "";

  if (import.meta.server) {
    return url || DEFAULT_URL;
  }

  // Docker-internal hostnames are never reachable from the browser.
  if (!url || url.includes("://pocketbase:")) {
    return window.location.origin;
  }

  return url;
}
