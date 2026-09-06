import { getSystemMetaJson, setSystemMetaJson } from "../lib/system-meta";
import { nowIso } from "../lib/timestamps";

export const ANNOUNCEMENT_META_KEY = "platform.announcement";

export type PlatformAnnouncementSeverity = "info" | "warning" | "critical";

export interface PlatformAnnouncement {
  active: boolean;
  severity: PlatformAnnouncementSeverity;
  message_th: string;
  message_en: string;
  expires_at: string | null;
  updated: string;
}

export function defaultAnnouncement(): PlatformAnnouncement {
  return {
    active: false,
    severity: "info",
    message_th: "",
    message_en: "",
    expires_at: null,
    updated: nowIso(),
  };
}

export async function getPlatformAnnouncement(): Promise<PlatformAnnouncement> {
  const stored = await getSystemMetaJson<PlatformAnnouncement>(ANNOUNCEMENT_META_KEY);
  return stored ?? defaultAnnouncement();
}

export async function setPlatformAnnouncement(
  input: Omit<PlatformAnnouncement, "updated">,
): Promise<PlatformAnnouncement> {
  const value: PlatformAnnouncement = {
    ...input,
    updated: nowIso(),
  };
  await setSystemMetaJson(ANNOUNCEMENT_META_KEY, value);
  return value;
}

export function resolveActiveAnnouncement(
  announcement: PlatformAnnouncement,
  now = new Date(),
): PlatformAnnouncement | null {
  if (!announcement.active) return null;
  if (announcement.expires_at && new Date(announcement.expires_at) < now) {
    return null;
  }
  const hasMessage = announcement.message_th.trim() || announcement.message_en.trim();
  if (!hasMessage) return null;
  return announcement;
}
