export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

const SENSITIVE_KEYS = new Set([
  "password",
  "refreshToken",
  "token",
  "authorization",
  "Authorization",
]);

let configuredLevel: LogLevel | null = null;

function resolveLogLevel(): LogLevel {
  if (configuredLevel) return configuredLevel;

  const fromEnv = String(import.meta.env.NUXT_PUBLIC_LOG_LEVEL || "").toLowerCase();
  if (
    fromEnv === "debug" ||
    fromEnv === "info" ||
    fromEnv === "warn" ||
    fromEnv === "error" ||
    fromEnv === "silent"
  ) {
    configuredLevel = fromEnv;
    return configuredLevel;
  }

  configuredLevel = import.meta.dev ? "debug" : "warn";
  return configuredLevel;
}

export function setLogLevel(level: LogLevel) {
  configuredLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[resolveLogLevel()];
}

function formatMessage(namespace: string, level: string, message: string): string {
  return `[${new Date().toISOString()}] [${namespace}] ${level.toUpperCase()} ${message}`;
}

export function redact<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((item) => redact(item)) as T;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEYS.has(key) ? "[REDACTED]" : redact(val);
    }
    return out as T;
  }
  return value;
}

export function createLogger(namespace: string) {
  const write = (
    level: LogLevel,
    consoleFn: (...args: unknown[]) => void,
    message: string,
    ...args: unknown[]
  ) => {
    if (!shouldLog(level)) return;
    consoleFn(formatMessage(namespace, level, message), ...args);
  };

  return {
    debug: (message: string, ...args: unknown[]) =>
      write("debug", console.debug, message, ...args),
    info: (message: string, ...args: unknown[]) =>
      write("info", console.info, message, ...args),
    warn: (message: string, ...args: unknown[]) =>
      write("warn", console.warn, message, ...args),
    error: (message: string, ...args: unknown[]) =>
      write("error", console.error, message, ...args),
  };
}
