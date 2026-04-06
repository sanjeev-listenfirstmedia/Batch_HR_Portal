/**
 * Send sample birthday + work-anniversary emails via SES for template QA.
 *
 * Requires AWS credentials (same as production), SES_FROM_EMAIL verified, and
 * recipient verified if your SES account is still in the sandbox.
 *
 * Usage:
 *   TEST_CELEBRATION_TO=you@company.com npm run test:celebration-emails
 *   npm run test:celebration-emails -- you@company.com
 */
import "dotenv/config";
import { loadConfig } from "./config/env.js";
import { createLogger } from "./utils/logger.js";
import { createSesClient, sendNotificationEmail } from "./services/sesService.js";
import { birthdayEmail } from "./templates/birthdayTemplate.js";
import { anniversaryEmail } from "./templates/anniversaryTemplate.js";

function recipientFromArgs(): string {
  const fromEnv = process.env.TEST_CELEBRATION_TO?.trim();
  if (fromEnv) return fromEnv;
  const arg = process.argv.slice(2).find((a) => !a.startsWith("-"))?.trim();
  return arg ?? "";
}

async function main() {
  const to = recipientFromArgs();
  if (!to) {
    console.error(
      "Set TEST_CELEBRATION_TO or pass an email as the first argument.\n" +
        "Example: TEST_CELEBRATION_TO=you@company.com npm run test:celebration-emails",
    );
    process.exit(1);
  }

  const config = loadConfig(process.env);
  const log = createLogger(config);

  if (!config.SES_FROM_EMAIL) {
    console.error("SES_FROM_EMAIL is required in .env");
    process.exit(1);
  }

  const sesConfig = {
    SES_FROM_EMAIL: config.SES_FROM_EMAIL,
    SES_FROM_NAME: config.SES_FROM_NAME,
    SES_NOTIFICATION_TO: to,
    SES_REPLY_TO: config.SES_REPLY_TO,
    SES_CONFIGURATION_SET: config.SES_CONFIGURATION_SET,
  };

  const ses = createSesClient(config);
  const multi = process.argv.includes("--multi");

  const b = multi
    ? birthdayEmail([
        { userId: "test-b1", displayName: "Jane Smith" },
        { userId: "test-b2", displayName: "Raj Patel" },
        { userId: "test-b3", displayName: "Maria Garcia" },
      ])
    : birthdayEmail([{ userId: "test-birthday", displayName: "Sample Teammate" }]);

  await sendNotificationEmail(
    ses,
    sesConfig,
    { subject: `[TEST] ${b.subject}`, htmlBody: b.html, textBody: b.text },
    log,
  );
  console.log(`Sent birthday test email (${multi ? "3 people" : "1 person"}) to`, to);

  const a = multi
    ? anniversaryEmail([
        { userId: "test-a1", displayName: "Jane Smith", years: 5 },
        { userId: "test-a2", displayName: "Raj Patel", years: 2 },
      ])
    : anniversaryEmail([{ userId: "test-anniversary", displayName: "Sample Teammate", years: 3 }]);

  await sendNotificationEmail(
    ses,
    sesConfig,
    { subject: `[TEST] ${a.subject}`, htmlBody: a.html, textBody: a.text },
    log,
  );
  console.log(`Sent anniversary test email (${multi ? "2 people" : "1 person"}) to`, to);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
