import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { AppConfig } from "../config/env.js";
import type { Logger } from "../utils/logger.js";

export type OutgoingMail = {
  subject: string;
  htmlBody: string;
  textBody: string;
};

/**
 * Creates a nodemailer transporter configured for Brevo SMTP.
 * Named createSesClient to keep all call sites unchanged.
 */
export function createSesClient(
  config: Pick<AppConfig, "SMTP_HOST" | "SMTP_PORT" | "SMTP_USER" | "SMTP_PASSWORD">,
): Transporter {
  return nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: false, // STARTTLS on port 587
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASSWORD,
    },
  });
}

export async function sendNotificationEmail(
  client: Transporter,
  config: Pick<
    AppConfig,
    "SES_FROM_EMAIL" | "SES_FROM_NAME" | "SES_NOTIFICATION_TO" | "SES_REPLY_TO" | "SES_CONFIGURATION_SET"
  >,
  mail: OutgoingMail,
  log: Logger,
): Promise<void> {
  if (!config.SES_FROM_EMAIL || !config.SES_NOTIFICATION_TO) {
    throw new Error("SES_FROM_EMAIL and SES_NOTIFICATION_TO are required to send mail");
  }

  const from = config.SES_FROM_NAME
    ? `${config.SES_FROM_NAME} <${config.SES_FROM_EMAIL}>`
    : config.SES_FROM_EMAIL;

  const info = await client.sendMail({
    from,
    to: config.SES_NOTIFICATION_TO,
    ...(config.SES_REPLY_TO?.trim() ? { replyTo: config.SES_REPLY_TO.trim() } : {}),
    subject: mail.subject,
    html: mail.htmlBody,
    text: mail.textBody,
  });

  log.info("mail_send_ok", { messageId: info.messageId });
}
