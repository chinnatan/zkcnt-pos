import type { RecordWithMeta } from "./types";

export function withMeta<T extends Record<string, unknown>>(
  collectionName: string,
  row: T,
): RecordWithMeta<T> {
  return {
    ...row,
    collectionId: collectionName,
    collectionName,
  };
}
