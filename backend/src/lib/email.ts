import { env } from "../env";

export async function sendInviteEmail(email: string, inviteLink: string) {
  if (!env.smtp.host || !env.smtp.from) {
    console.log(`[invite] ${email} → ${inviteLink}`);
    return;
  }

  // Basic SMTP via fetch to external service is not built-in;
  // log link for dev; production can wire nodemailer later.
  console.log(`[invite email] to=${email} link=${inviteLink}`);
}
