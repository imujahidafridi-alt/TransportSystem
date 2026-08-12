import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

let s3ClientInstance: S3Client | null = null;

export function getR2Client(): S3Client | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

  if (!accessKeyId || !secretAccessKey || !endpoint) {
    return null; // Not configured yet
  }

  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: 'auto',
      endpoint: endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return s3ClientInstance;
}

export async function uploadToR2(key: string, content: string | Buffer): Promise<boolean> {
  const client = getR2Client();
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!client || !bucketName) {
    // Cloud storage not configured yet - normal offline operation
    return false;
  }

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: content,
      ContentType: key.endsWith('.json') ? 'application/json' : 'application/octet-stream',
    });

    await client.send(command);
    console.log(`[R2 Storage] Uploaded artifact successfully to R2 key: ${key}`);
    return true;
  } catch (error) {
    console.error(`[R2 Storage] Failed uploading to R2 key ${key}:`, error);
    throw error;
  }
}
