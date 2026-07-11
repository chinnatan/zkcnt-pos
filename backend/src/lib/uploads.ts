export interface UploadBackend {
  saveUpload(
    collection: string,
    recordId: string,
    field: string,
    file: File,
  ): Promise<string>;
  saveUploadFromBlob(
    collection: string,
    recordId: string,
    field: string,
    blob: Blob,
    filename?: string,
  ): Promise<string>;
  deleteUpload(relativePath: string): Promise<void>;
  getUpload(relativePath: string): Promise<Response | null>;
}

export function buildRelativePath(
  collection: string,
  recordId: string,
  field: string,
  ext: string,
): string {
  return `${collection}/${recordId}/${field}.${ext}`;
}

function createR2Backend(bucket: R2Bucket): UploadBackend {
  return {
    async saveUpload(collection, recordId, field, file) {
      const ext = file.name.split(".").pop() || "bin";
      const relative = buildRelativePath(collection, recordId, field, ext);
      await bucket.put(relative, file.stream(), {
        httpMetadata: { contentType: file.type || "application/octet-stream" },
      });
      return relative;
    },
    async saveUploadFromBlob(collection, recordId, field, blob, filename) {
      const ext = filename?.split(".").pop() || "bin";
      const relative = buildRelativePath(collection, recordId, field, ext);
      await bucket.put(relative, blob, {
        httpMetadata: { contentType: blob.type || "application/octet-stream" },
      });
      return relative;
    },
    async deleteUpload(relativePath) {
      if (!relativePath) return;
      await bucket.delete(relativePath);
    },
    async getUpload(relativePath) {
      if (!relativePath) return null;
      const object = await bucket.get(relativePath);
      if (!object) return null;
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("cache-control", "public, max-age=3600");
      return new Response(object.body, { headers });
    },
  };
}

let activeBackend: UploadBackend | null = null;

export function initUploadBackend(backend: UploadBackend): UploadBackend {
  activeBackend = backend;
  return backend;
}

export function initR2Uploads(bucket: R2Bucket): UploadBackend {
  return initUploadBackend(createR2Backend(bucket));
}

function getUploadBackend(): UploadBackend {
  if (!activeBackend) {
    throw new Error(
      "Upload backend not initialized. Call initR2Uploads() first.",
    );
  }
  return activeBackend;
}

export async function saveUpload(
  collection: string,
  recordId: string,
  field: string,
  file: File,
): Promise<string> {
  return getUploadBackend().saveUpload(collection, recordId, field, file);
}

export async function saveUploadFromBlob(
  collection: string,
  recordId: string,
  field: string,
  blob: Blob,
  filename?: string,
): Promise<string> {
  return getUploadBackend().saveUploadFromBlob(
    collection,
    recordId,
    field,
    blob,
    filename,
  );
}

export async function deleteUpload(relativePath: string): Promise<void> {
  await getUploadBackend().deleteUpload(relativePath);
}

export async function getUpload(relativePath: string): Promise<Response | null> {
  return getUploadBackend().getUpload(relativePath);
}
