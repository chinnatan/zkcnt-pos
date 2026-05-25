import type { BaseRecord } from "../types";

/**
 * Last-write-wins conflict resolution.
 * Compares the `updated` timestamp of two records.
 * Returns the more recently updated one.
 */
export function resolveConflict<T extends BaseRecord>(local: T, remote: T): T {
  const localTime = new Date(local.updated).getTime();
  const remoteTime = new Date(remote.updated).getTime();

  // Server (remote) wins on tie
  return remoteTime >= localTime ? remote : local;
}

/**
 * Generates a client-side unique ID for offline record creation.
 * Format: timestamp-random to ensure rough ordering + uniqueness.
 */
export function generateClientId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}
