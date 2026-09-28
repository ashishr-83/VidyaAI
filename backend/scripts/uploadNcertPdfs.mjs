/**
 * Uploads all NCERT Class 7 chapter PDFs from the local NCERT/ folder
 * to MinIO (local S3 replacement) using the S3 SDK.
 *
 * Run from the backend/ directory:
 *   node scripts/uploadNcertPdfs.mjs
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const s3 = new S3Client({
  region: 'us-east-1',
  endpoint: 'http://localhost:9000',
  forcePathStyle: true,          // required for MinIO
  credentials: {
    accessKeyId: process.env.MINIO_ROOT_USER ?? 'minioadmin',
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD ?? 'minioadmin',
  },
});

const BUCKET = 'vidyaai-audio';
const NCERT_ROOT = join(__dirname, '..', '..', 'NCERT', 'Class_7');

const SUBJECTS = [
  { folder: 'Mathematics',    s3Prefix: 'NCERT/Class_7/Mathematics' },
  { folder: 'Science',        s3Prefix: 'NCERT/Class_7/Science' },
  { folder: 'Social Science', s3Prefix: 'NCERT/Class_7/SocialScience' },
];

// Skip prelims, glossary, and other non-chapter files
const SKIP_RE = /^ch_00_|^glossary_/;

async function uploadFile(localPath, s3Key) {
  const body = readFileSync(localPath);
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    Body: body,
    ContentType: 'application/pdf',
  }));
  console.log(`  ✔  ${s3Key}`);
}

async function main() {
  let total = 0;

  for (const { folder, s3Prefix } of SUBJECTS) {
    const dir = join(NCERT_ROOT, folder);
    const files = readdirSync(dir)
      .filter(f => f.endsWith('.pdf') && !SKIP_RE.test(f))
      .sort();

    console.log(`\n── ${folder} (${files.length} chapters) ──`);

    for (const file of files) {
      await uploadFile(join(dir, file), `${s3Prefix}/${file}`);
      total++;
    }
  }

  console.log(`\nDone. ${total} PDFs uploaded to s3://${BUCKET}`);
}

main().catch(err => { console.error(err); process.exit(1); });
