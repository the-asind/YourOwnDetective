import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost:9000';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || 'minioadmin';
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || 'minioadmin';
const S3_REGION = process.env.S3_REGION || 'us-east-1';
export const S3_BUCKET = process.env.S3_BUCKET || 'squares-media';

// Public URL base: in docker-compose, MinIO is reverse-proxied through the app.
// Files are served at /media/<key> via Express static or proxy route.
export const S3_PUBLIC_BASE = process.env.S3_PUBLIC_BASE || '/media';

const s3 = new S3Client({
  endpoint: S3_ENDPOINT,
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
  },
  forcePathStyle: true, // Required for MinIO
});

/**
 * Ensure the target bucket exists, creating it if necessary.
 */
export async function ensureBucket(bucket: string = S3_BUCKET): Promise<void> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`[S3] Bucket "${bucket}" exists.`);
  } catch {
    console.log(`[S3] Creating bucket "${bucket}"...`);
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log(`[S3] Bucket "${bucket}" created.`);
  }
}

/**
 * Upload a file to S3/MinIO. Returns the public URL path.
 */
export async function uploadFile(
  key: string,
  body: Buffer,
  contentType: string,
  bucket: string = S3_BUCKET,
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      // Make object publicly readable
      ACL: 'public-read',
    }),
  );
  return `${S3_PUBLIC_BASE}/${key}`;
}

/**
 * Delete a file from S3/MinIO.
 */
export async function deleteFile(
  key: string,
  bucket: string = S3_BUCKET,
): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

export { s3 };
