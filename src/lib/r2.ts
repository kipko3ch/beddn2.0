import "server-only";
import { S3Client } from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 is S3-compatible. We talk to it with the AWS S3 SDK pointed at
 * the R2 endpoint. These env vars must be set (Coolify / .env.local):
 *
 *   R2_ACCOUNT_ID          - your Cloudflare account id
 *   R2_ACCESS_KEY_ID       - R2 API token access key
 *   R2_SECRET_ACCESS_KEY   - R2 API token secret
 *   R2_BUCKET              - bucket name (e.g. "beddn-images")
 *   R2_PUBLIC_URL          - public base url for the bucket, no trailing slash
 *                            (r2.dev URL or a custom domain), e.g.
 *                            https://pub-xxxxxxxx.r2.dev
 */

export const R2_BUCKET = process.env.R2_BUCKET ?? "";
export const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");

export function isR2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      R2_BUCKET &&
      R2_PUBLIC_URL
  );
}

let client: S3Client | null = null;

export function getR2Client() {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}

export function publicUrlForKey(key: string) {
  return `${R2_PUBLIC_URL}/${key}`;
}
