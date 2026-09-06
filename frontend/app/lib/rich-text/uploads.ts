export const SUPPORT_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
export const SUPPORT_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;

export function validateSupportImage(file: File): string | null {
  if (!SUPPORT_IMAGE_MIMES.includes(file.type as (typeof SUPPORT_IMAGE_MIMES)[number])) {
    return "support.imageInvalidType";
  }
  if (file.size > SUPPORT_IMAGE_MAX_SIZE) {
    return "support.imageTooLarge";
  }
  return null;
}

export async function prepareSupportImageUpload(file: File): Promise<File> {
  const errorKey = validateSupportImage(file);
  if (errorKey) {
    throw new Error(errorKey);
  }

  if (!import.meta.client) {
    return file;
  }

  try {
    const { optimizeImageFile } = await import("~/lib/files/optimize-image");
    const optimized = await optimizeImageFile(file, {
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 0.85,
      mimeType: "image/webp",
    });
    const optimizedError = validateSupportImage(optimized);
    return optimizedError ? file : optimized;
  } catch {
    return file;
  }
}

export function expandUploadUrls(html: string, getUrl: (path: string) => string): string {
  if (!html?.trim()) return html;
  return html.replace(
    /<img([^>]*)\ssrc=(["'])(support_attachments\/[^"']+)\2/gi,
    (_match, attrs: string, quote: string, path: string) =>
      `<img${attrs} src=${quote}${getUrl(path)}${quote}`,
  );
}

export function collapseUploadUrls(html: string, uploadsBase: string): string {
  if (!html?.trim()) return html;

  const normalizedBase = uploadsBase.replace(/\/$/, "");

  return html.replace(
    /<img([^>]*)\ssrc=(["'])([^"']+)\2/gi,
    (_match, attrs: string, quote: string, src: string) => {
      if (src.startsWith("support_attachments/")) {
        return `<img${attrs} src=${quote}${src.split("?")[0]}${quote}`;
      }

      if (src.startsWith(`${normalizedBase}/`)) {
        const path = src.slice(normalizedBase.length + 1).split("?")[0] ?? "";
        if (path.startsWith("support_attachments/")) {
          return `<img${attrs} src=${quote}${path}${quote}`;
        }
      }

      const pathMatch = src.match(/\/uploads\/(support_attachments\/[^?#"']+)/i);
      if (pathMatch?.[1]) {
        return `<img${attrs} src=${quote}${pathMatch[1]}${quote}`;
      }

      return `<img${attrs} src=${quote}${src}${quote}`;
    },
  );
}
