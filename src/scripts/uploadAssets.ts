/**
 * Uploads the contents of the `public/` folder to S3 and writes
 * CELEBRATION_ASSET_BASE_URL into your .env file automatically.
 *
 * Usage:
 *   npm run upload:assets
 *   npm run upload:assets -- --bucket my-custom-bucket-name
 *
 * Bucket defaults to: batch-hr-portal-assets-{stage}
 * Images are placed at:  s3://{bucket}/celebrations/
 * Public URL written to: CELEBRATION_ASSET_BASE_URL in .env
 *
 * The bucket is created automatically if it does not exist.
 * Public-read access is enabled via a bucket policy (not ACLs,
 * compatible with the S3 "block public access" default).
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  S3Client,
  CreateBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  HeadBucketCommand,
  DeletePublicAccessBlockCommand,
} from "@aws-sdk/client-s3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");

/* ── Config ─────────────────────────────────────────────────────────────── */

const REGION = (process.env.AWS_REGION ?? "ap-south-1").trim();
const STAGE = (process.env.SERVERLESS_STAGE ?? "dev").trim();
const DEFAULT_BUCKET = `batch-hr-portal-assets-${STAGE}`;
const S3_PREFIX = "celebrations";
const PUBLIC_DIR = path.join(ROOT, "public");
const ENV_FILE = path.join(ROOT, ".env");

function parseBucketArg(): string {
  const idx = process.argv.indexOf("--bucket");
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1]!;
  return DEFAULT_BUCKET;
}

/* ── MIME map ────────────────────────────────────────────────────────────── */

function contentType(file: string): string {
  const ext = path.extname(file).toLowerCase();
  const map: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
  };
  return map[ext] ?? "application/octet-stream";
}

/* ── .env updater ────────────────────────────────────────────────────────── */

function updateEnvFile(key: string, value: string): void {
  let content = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, "utf8") : "";
  const line = `${key}=${value}`;
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(content)) {
    content = content.replace(regex, line);
    console.log(`  ✓ Updated ${key} in .env`);
  } else {
    content = content.trimEnd() + `\n\n# Written by upload:assets\n${line}\n`;
    console.log(`  ✓ Added ${key} to .env`);
  }
  fs.writeFileSync(ENV_FILE, content, "utf8");
}

/* ── Main ────────────────────────────────────────────────────────────────── */

async function main(): Promise<void> {
  const bucket = parseBucketArg();

  console.log(`\nUploading assets from public/ → s3://${bucket}/${S3_PREFIX}/`);
  console.log(`Region: ${REGION}\n`);

  const s3 = new S3Client({ region: REGION });

  // 1. Create bucket if it doesn't exist
  let bucketExists = false;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    bucketExists = true;
    console.log(`  Bucket s3://${bucket} already exists — skipping creation.`);
  } catch {
    console.log(`  Creating bucket s3://${bucket} in ${REGION} …`);
    const createParams =
      REGION === "us-east-1"
        ? { Bucket: bucket }
        : { Bucket: bucket, CreateBucketConfiguration: { LocationConstraint: REGION as never } };
    await s3.send(new CreateBucketCommand(createParams));
    console.log(`  Bucket created.`);
  }

  // 2. Remove public-access block (needed before setting a public bucket policy)
  if (!bucketExists) {
    console.log(`  Disabling "block public access" on bucket …`);
    await s3.send(
      new DeletePublicAccessBlockCommand({ Bucket: bucket }),
    );
  }

  // 3. Set public-read bucket policy
  const policy = JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "PublicReadGetObject",
        Effect: "Allow",
        Principal: "*",
        Action: "s3:GetObject",
        Resource: `arn:aws:s3:::${bucket}/${S3_PREFIX}/*`,
      },
    ],
  });
  console.log(`  Setting bucket policy for public read on /${S3_PREFIX}/* …`);
  await s3.send(new PutBucketPolicyCommand({ Bucket: bucket, Policy: policy }));

  // 4. Upload all files from public/
  const files = fs.readdirSync(PUBLIC_DIR).filter((f) => {
    const full = path.join(PUBLIC_DIR, f);
    return fs.statSync(full).isFile();
  });

  if (files.length === 0) {
    console.error("\n  ✗ No files found in public/ — nothing to upload.");
    process.exit(1);
  }

  for (const file of files) {
    const filePath = path.join(PUBLIC_DIR, file);
    const key = `${S3_PREFIX}/${file}`;
    const body = fs.readFileSync(filePath);
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType(file),
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    const size = (body.length / 1024).toFixed(1);
    console.log(`  ✓ Uploaded ${file}  (${size} KB)`);
  }

  // 5. Write CELEBRATION_ASSET_BASE_URL to .env
  const baseUrl = `https://${bucket}.s3.${REGION}.amazonaws.com/${S3_PREFIX}`;
  console.log(`\nAll ${files.length} file(s) uploaded.`);
  console.log(`\nPublic base URL:\n  ${baseUrl}\n`);
  updateEnvFile("CELEBRATION_ASSET_BASE_URL", baseUrl);

  console.log(`\nDone! Run the test again to see images in your email:\n`);
  console.log(`  npm run test:celebration-emails -- your@email.com\n`);
}

main().catch((err: unknown) => {
  console.error("\n✗ Upload failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
