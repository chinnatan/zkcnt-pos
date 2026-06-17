import { env } from "../env";
import { createLogger } from "./logger";

const logger = createLogger("email");

export async function sendInviteEmail(email: string, inviteLink: string) {
  if (!env.smtp.host || !env.smtp.from) {
    logger.debug(`invite (dev) to=${email} link=${inviteLink}`);
    return;
  }

  // Basic SMTP via fetch to external service is not built-in;
  // log link for dev; production can wire nodemailer later.
  logger.debug(`invite email to=${email} link=${inviteLink}`);
}
