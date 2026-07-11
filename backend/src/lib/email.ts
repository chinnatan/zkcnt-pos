import { Resend } from "resend";
import { getRuntimeConfig } from "../env";
import { createLogger } from "./logger";

const logger = createLogger("email");

function getResendClient(): Resend | null {
  const { apiKey } = getRuntimeConfig().resend;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  devLogLabel: string;
  devLogLink?: string;
}) {
  const { to, subject, html, devLogLabel, devLogLink } = options;
  const resendConfig = getRuntimeConfig().resend;

  if (!resendConfig.apiKey || !resendConfig.from) {
    logger.debug(`${devLogLabel} (dev) to=${to}${devLogLink ? ` link=${devLogLink}` : ""}`);
    return;
  }

  const resend = getResendClient();
  if (!resend) return;

  const { error } = await resend.emails.send({
    from: resendConfig.from,
    to,
    subject,
    html,
  });

  if (error) {
    logger.error(`${devLogLabel} failed to=${to}: ${error.message}`);
    throw new Error("Failed to send email");
  }

  logger.info(`${devLogLabel} sent to=${to}`);
}

function emailButton(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">${label}</a>`;
}

function emailLayout(body: string) {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;color:#1f2937;line-height:1.6;max-width:480px;margin:0 auto;padding:24px">${body}</body></html>`;
}

export async function sendInviteEmail(email: string, inviteLink: string) {
  const html = emailLayout(`
    <h2 style="margin:0 0 16px;font-size:20px">คุณได้รับเชิญเข้าร่วมทีม</h2>
    <p style="margin:0 0 24px">คลิกปุ่มด้านล่างเพื่อยอมรับคำเชิญและเข้าร่วมร้านค้า</p>
    <p style="margin:0 0 24px">${emailButton(inviteLink, "ยอมรับคำเชิญ")}</p>
    <p style="margin:0;font-size:12px;color:#6b7280">หรือคัดลอกลิงก์นี้: <a href="${inviteLink}">${inviteLink}</a></p>
  `);

  await sendEmail({
    to: email,
    subject: "คำเชิญเข้าร่วมทีม — zKCNT POS",
    html,
    devLogLabel: "invite",
    devLogLink: inviteLink,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  resetLink: string,
  userName: string,
) {
  const html = emailLayout(`
    <h2 style="margin:0 0 16px;font-size:20px">รีเซ็ตรหัสผ่าน</h2>
    <p style="margin:0 0 8px">สวัสดี ${userName},</p>
    <p style="margin:0 0 24px">เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณ คลิกปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่ ลิงก์นี้ใช้ได้ 1 ชั่วโมง</p>
    <p style="margin:0 0 24px">${emailButton(resetLink, "รีเซ็ตรหัสผ่าน")}</p>
    <p style="margin:0;font-size:12px;color:#6b7280">หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน สามารถเพิกเฉยอีเมลนี้ได้<br>หรือคัดลอกลิงก์นี้: <a href="${resetLink}">${resetLink}</a></p>
  `);

  await sendEmail({
    to: email,
    subject: "รีเซ็ตรหัสผ่าน — zKCNT POS",
    html,
    devLogLabel: "password-reset",
    devLogLink: resetLink,
  });
}
