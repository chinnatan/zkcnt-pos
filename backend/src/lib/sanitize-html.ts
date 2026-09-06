const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "ul",
  "ol",
  "li",
  "a",
  "code",
  "pre",
  "img",
]);

const SUPPORT_IMAGE_PATH =
  /^support_attachments\/[a-zA-Z0-9/-]+\.(?:jpe?g|png|webp)$/i;

function normalizeImageSrc(rawSrc: string): string | null {
  const src = rawSrc.trim();
  if (!src) return null;

  if (SUPPORT_IMAGE_PATH.test(src)) {
    return src;
  }

  const uploadsMatch = src.match(/(?:^|\/)uploads\/(support_attachments\/[^?#"']+)/i);
  if (uploadsMatch?.[1] && SUPPORT_IMAGE_PATH.test(uploadsMatch[1])) {
    return uploadsMatch[1];
  }

  try {
    const url = new URL(src);
    const pathMatch = url.pathname.match(/\/uploads\/(support_attachments\/[^/?#]+)/i);
    if (pathMatch?.[1] && SUPPORT_IMAGE_PATH.test(pathMatch[1])) {
      return pathMatch[1];
    }
  } catch {
    // not an absolute URL
  }

  return null;
}

function stripDisallowedTags(html: string): string {
  return html.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tag: string) => {
    const name = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(name)) return "";
    if (match.startsWith("</")) return `</${name}>`;
    if (name === "br") return "<br>";

    if (name === "a") {
      const hrefMatch = match.match(/\shref=(["'])(.*?)\1/i);
      if (!hrefMatch) return "<a>";
      const href = hrefMatch[2]?.trim() ?? "";
      if (/^javascript:/i.test(href) || /^data:/i.test(href)) return "<a>";
      const safeHref = href.replace(/"/g, "&quot;");
      return `<a href="${safeHref}" rel="noopener noreferrer" target="_blank">`;
    }

    if (name === "img") {
      const srcMatch = match.match(/\ssrc=(["'])(.*?)\1/i);
      if (!srcMatch) return "";
      const normalized = normalizeImageSrc(srcMatch[2] ?? "");
      if (!normalized) return "";
      const altMatch = match.match(/\salt=(["'])(.*?)\1/i);
      const alt = altMatch?.[2]?.replace(/"/g, "&quot;") ?? "";
      return `<img src="${normalized.replace(/"/g, "&quot;")}" alt="${alt}">`;
    }

    return `<${name}>`;
  });
}

export function sanitizeHtml(html: string): string {
  if (!html?.trim()) return "";

  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\s(on\w+|style)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  cleaned = stripDisallowedTags(cleaned);
  return cleaned.trim();
}

export function htmlToPlainText(html: string): string {
  if (!html?.trim()) return "";

  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function sanitizeRichText(html: string): { bodyHtml: string; bodyText: string } {
  const bodyHtml = sanitizeHtml(html);
  const bodyText = htmlToPlainText(bodyHtml);
  return { bodyHtml, bodyText };
}
