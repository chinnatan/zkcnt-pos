import type { WorkerBindings } from "./types/bindings";

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

export interface RuntimeConfig {
  jwtSecret: string;
  appUrl: string;
  logLevel: LogLevel;
  allowedOrigin: string;
  resend: {
    apiKey: string;
    from: string;
  };
  uploadsDir?: string;
}

let runtimeConfig: RuntimeConfig | null = null;

export function parseLogLevel(value: string | undefined): LogLevel {
  const level = value?.toLowerCase();
  if (
    level === "debug" ||
    level === "info" ||
    level === "warn" ||
    level === "error" ||
    level === "silent"
  ) {
    return level;
  }
  return "info";
}

export function initRuntimeConfig(config: RuntimeConfig): RuntimeConfig {
  runtimeConfig = config;
  return config;
}

export function initRuntimeConfigFromWorker(bindings: WorkerBindings): RuntimeConfig {
  return initRuntimeConfig({
    jwtSecret: bindings.JWT_SECRET,
    appUrl: bindings.APP_URL.replace(/\/$/, ""),
    logLevel: parseLogLevel(bindings.LOG_LEVEL),
    allowedOrigin: bindings.ALLOWED_ORIGIN ?? bindings.APP_URL,
    resend: {
      apiKey: bindings.RESEND_API_KEY ?? "",
      from: bindings.RESEND_FROM ?? "",
    },
  });
}

export function getRuntimeConfig(): RuntimeConfig {
  if (!runtimeConfig) {
    throw new Error("Runtime config not initialized");
  }
  return runtimeConfig;
}
