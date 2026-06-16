export function resolveApiBaseUrl(configured?: string): string {
  const url = configured?.trim();
  if (url) {
    const base = url.replace(/\/$/, "");
    return base.endsWith("/api") ? base : `${base}/api`;
  }

  if (import.meta.client) {
    return `${window.location.origin}/api`;
  }

  return "http://localhost:3001/api";
}

export function resolveUploadsBaseUrl(apiBase: string): string {
  if (import.meta.client && apiBase.startsWith(window.location.origin)) {
    return `${window.location.origin}/uploads`;
  }
  const root = apiBase.replace(/\/api\/?$/, "");
  return `${root}/uploads`;
}
