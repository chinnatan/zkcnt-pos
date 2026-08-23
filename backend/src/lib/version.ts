export function readAppVersion(): string {
  const fromEnv = process.env.APP_VERSION?.trim();
  if (fromEnv) return fromEnv.replace(/^v/i, "");
  return "0.0.0";
}

export function readBuildId(): string {
  return process.env.BUILD_ID?.trim() || "dev";
}
