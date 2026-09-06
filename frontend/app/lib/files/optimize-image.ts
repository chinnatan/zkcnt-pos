export interface OptimizeImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: "image/webp" | "image/jpeg";
  /** Skip re-encode when already small enough (bytes). */
  skipBelowBytes?: number;
}

const DEFAULT_MAX_DIMENSION = 1920;
const DEFAULT_QUALITY = 0.85;
const DEFAULT_SKIP_BELOW_BYTES = 350_000;

export function fitImageDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

async function loadBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: "from-image" });
}

function buildOptimizedFilename(file: File, mimeType: string): string {
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  const ext = mimeType === "image/webp" ? "webp" : "jpg";
  return `${baseName}.${ext}`;
}

export async function optimizeImageFile(
  file: File,
  options: OptimizeImageOptions = {},
): Promise<File> {
  const maxWidth = options.maxWidth ?? DEFAULT_MAX_DIMENSION;
  const maxHeight = options.maxHeight ?? DEFAULT_MAX_DIMENSION;
  const quality = options.quality ?? DEFAULT_QUALITY;
  const targetMime = options.mimeType ?? "image/webp";
  const skipBelowBytes = options.skipBelowBytes ?? DEFAULT_SKIP_BELOW_BYTES;

  const bitmap = await loadBitmap(file);
  const target = fitImageDimensions(bitmap.width, bitmap.height, maxWidth, maxHeight);
  const sameDimensions = target.width === bitmap.width && target.height === bitmap.height;
  const alreadySmall =
    sameDimensions &&
    file.type === targetMime &&
    file.size <= skipBelowBytes;

  if (alreadySmall) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = target.width;
  canvas.height = target.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.drawImage(bitmap, 0, 0, target.width, target.height);
  bitmap.close();

  let blob = await canvasToBlob(canvas, targetMime, quality);
  if (!blob && targetMime === "image/webp") {
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
  }

  if (!blob) {
    return file;
  }

  const outputMime = blob.type || (targetMime === "image/webp" ? "image/jpeg" : targetMime);
  if (blob.size >= file.size && file.size <= skipBelowBytes * 2) {
    return file;
  }

  return new File([blob], buildOptimizedFilename(file, outputMime), {
    type: outputMime,
    lastModified: Date.now(),
  });
}
