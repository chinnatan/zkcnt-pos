export interface WorkerBindings {
  DB: D1Database;
  UPLOADS: R2Bucket;
  JWT_SECRET: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  APP_URL: string;
  LOG_LEVEL?: string;
  ALLOWED_ORIGIN?: string;
}
