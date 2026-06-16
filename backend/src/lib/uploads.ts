import { join } from "node:path";
import { unlinkSync } from "node:fs";
import { env } from "../env";

export function saveUpload(
  collection: string,
  recordId: string,
  field: string,
  file: File,
): string {
  const ext = file.name.split(".").pop() || "bin";
  const relative = `${collection}/${recordId}/${field}.${ext}`;
  const fullPath = join(env.uploadsDir, relative);
  const dir = join(env.uploadsDir, collection, recordId);
  Bun.write(fullPath, file);
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
