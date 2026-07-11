import { mkdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import {
  buildRelativePath,
  initUploadBackend,
  type UploadBackend,
} from "./uploads";

function createFilesystemBackend(uploadsDir: string): UploadBackend {
  function ensureUploadDir(collection: string, recordId: string): string {
    const dir = join(uploadsDir, collection, recordId);
    mkdirSync(dir, { recursive: true });
    return dir;
  }

  return {
    async saveUpload(collection, recordId, field, file) {
      const ext = file.name.split(".").pop() || "bin";
      const relative = buildRelativePath(collection, recordId, field, ext);
      const fullPath = join(uploadsDir, relative);
      ensureUploadDir(collection, recordId);
      await Bun.write(fullPath, file);
      return relative;
    },
    async saveUploadFromBlob(collection, recordId, field, blob, filename) {
      const ext = filename?.split(".").pop() || "bin";
      const relative = buildRelativePath(collection, recordId, field, ext);
      const fullPath = join(uploadsDir, relative);
      ensureUploadDir(collection, recordId);
      await Bun.write(fullPath, blob);
      return relative;
    },
    async deleteUpload(relativePath) {
      if (!relativePath) return;
      try {
        unlinkSync(join(uploadsDir, relativePath));
      } catch {
        // ignore
      }
    },
    async getUpload(relativePath) {
      if (!relativePath) return null;
      const file = Bun.file(join(uploadsDir, relativePath));
      if (!(await file.exists())) return null;
      return new Response(file);
    },
  };
}

export function initFilesystemUploads(uploadsDir: string): UploadBackend {
  return initUploadBackend(createFilesystemBackend(uploadsDir));
}
