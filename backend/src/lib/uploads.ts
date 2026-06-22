import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { unlinkSync } from "node:fs";
import { env } from "../env";

function ensureUploadDir(collection: string, recordId: string): string {
  const dir = join(env.uploadsDir, collection, recordId);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export async function saveUpload(
  collection: string,
  recordId: string,
  field: string,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const relative = `${collection}/${recordId}/${field}.${ext}`;
  const fullPath = join(env.uploadsDir, relative);
  ensureUploadDir(collection, recordId);
  await Bun.write(fullPath, file);
  return relative;
}

export async function saveUploadFromBlob(
  collection: string,
  recordId: string,
  field: string,
  blob: Blob,
  filename?: string,
): Promise<string> {
  const ext = filename?.split(".").pop() || "bin";
  const relative = `${collection}/${recordId}/${field}.${ext}`;
  const fullPath = join(env.uploadsDir, relative);
  ensureUploadDir(collection, recordId);
  await Bun.write(fullPath, blob);
  return relative;
}

export function deleteUpload(relativePath: string) {
  if (!relativePath) return;
  try {
    unlinkSync(join(env.uploadsDir, relativePath));
  } catch {
    // ignore
  }
}
