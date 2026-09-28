/**
 * Standalone ingestion runner — connects directly to local DB + MinIO + OpenAI.
 * Run from project root:  node backend/scripts/runIngestAll.mjs
 *
 * Requires these env vars (reads from backend/.env automatically):
 *   DATABASE_URL, OPENAI_API_KEY, AWS_ENDPOINT_URL, AWS_S3_BUCKET,
 *   MINIO_ROOT_USER, MINIO_ROOT_PASSWORD
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load backend/.env manually ────────────────────────────────────────────────
const envPath = join(__dirname, '..', '.env');
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  const val = trimmed.slice(eq + 1).trim();
  if (!process.env[key]) process.env[key] = val;
}

// ── Dynamic imports (after env is set) ───────────────────────────────────────
const { default: OpenAI } = await import('openai');
const { PrismaClient } = await import('@prisma/client');
// pdf-parse is CJS
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// pdf-parse v1 exports the parse function directly
const pdfParse = require('pdf-parse');

const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// PDFs are read from the local filesystem — S3 key maps to NCERT/ folder structure.
// e.g. "NCERT/Class_7/Mathematics/ch_01.pdf" → <project-root>/NCERT/Class_7/Mathematics/ch_01.pdf
const NCERT_ROOT  = join(__dirname, '..', '..', 'NCERT');
const EMBED_MODEL = process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small';
const EMBED_DIMS  = parseInt(process.env.EMBEDDING_DIMS ?? '1536', 10);
const CHUNK_TARGET   = 1600;
const CHUNK_OVERLAP  = 320;
const CHUNK_MIN      = 240;
const EMBED_BATCH    = 100;
const HEADER_RE      = /^\s*(\d+|Page \d+|NCERT|Chapter \d+|www\.ncert\.nic\.in)\s*$/i;

// ── chunkText ─────────────────────────────────────────────────────────────────
function chunkText(pages) {
  const result = [];
  let chunkIndex = 0;
  for (let pi = 0; pi < pages.length; pi++) {
    const pageNumber = pi + 1;
    const paragraphs = (pages[pi] ?? '')
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length >= CHUNK_MIN && !HEADER_RE.test(p));
    let cur = '';
    for (const para of paragraphs) {
      if (!cur) { cur = para; continue; }
      if (cur.length + 1 + para.length > CHUNK_TARGET) {
        result.push({ pageNumber, chunkIndex, text: cur });
        chunkIndex++;
        cur = cur.slice(Math.max(0, cur.length - CHUNK_OVERLAP)) + '\n\n' + para;
      } else {
        cur += '\n\n' + para;
      }
    }
    if (cur.length >= CHUNK_MIN) { result.push({ pageNumber, chunkIndex, text: cur }); chunkIndex++; }
  }
  return result;
}

// ── ingestOne ─────────────────────────────────────────────────────────────────
async function ingestOne(chapter) {
  const { id: chapterId, pdfS3Key, subject, chapterNumber, chapterName } = chapter;
  const label = `${subject} ch${String(chapterNumber).padStart(2,'0')} — ${chapterName}`;

  // 1. Read PDF from local filesystem (pdfS3Key mirrors the path under NCERT/)
  // e.g. "NCERT/Class_7/SocialScience/ch_01.pdf" → NCERT/Class_7/Social Science/ch_01.pdf on disk
  const localPath = join(NCERT_ROOT, pdfS3Key.replace(/^NCERT\//, '').replace('SocialScience', 'Social Science'));
  const pdfBuffer = readFileSync(localPath);

  // 2. Extract text per page
  const pages = [];
  await pdfParse(pdfBuffer, {
    pagerender: (pd) => pd.getTextContent().then(tc => {
      pages.push(tc.items.map(i => i.str).join(' '));
      return '';
    }),
  });

  // 3. Chunk
  const rawChunks = chunkText(pages);
  if (rawChunks.length === 0) {
    console.log(`  ⚠  ${label}: no usable text chunks — skipping`);
    return 0;
  }

  // 4. Embed in batches
  const embedded = [];
  for (let i = 0; i < rawChunks.length; i += EMBED_BATCH) {
    const batch = rawChunks.slice(i, i + EMBED_BATCH);
    const res = await openai.embeddings.create({
      model: EMBED_MODEL,
      input: batch.map(c => c.text),
      dimensions: EMBED_DIMS,
    });
    for (let j = 0; j < batch.length; j++) {
      embedded.push({ ...batch[j], embedding: res.data[j].embedding });
    }
  }

  // 5. Upsert — delete old chunks then insert fresh
  await prisma.$executeRawUnsafe(`DELETE FROM "ChapterChunk" WHERE "chapterId" = $1`, chapterId);
  for (const chunk of embedded) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "ChapterChunk" ("id","chapterId","pageNumber","chunkIndex","text","embedding")
       VALUES ($1,$2,$3,$4,$5,$6::vector)`,
      randomUUID(), chapterId, chunk.pageNumber, chunk.chunkIndex, chunk.text,
      `[${chunk.embedding.join(',')}]`,
    );
  }

  // 6. Mark processed
  await prisma.chapterContent.update({ where: { id: chapterId }, data: { processedAt: new Date() } });
  return embedded.length;
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  const chapters = await prisma.chapterContent.findMany({
    where: { pdfS3Key: { not: null } },
    orderBy: [{ subject: 'asc' }, { chapterNumber: 'asc' }],
  });

  console.log(`\nIngesting ${chapters.length} chapters...\n`);

  let totalChunks = 0;
  const failed = [];

  for (const ch of chapters) {
    const label = `${ch.subject} ch${String(ch.chapterNumber).padStart(2,'0')} — ${ch.chapterName}`;
    try {
      process.stdout.write(`  ⏳ ${label} ... `);
      const n = await ingestOne(ch);
      totalChunks += n;
      console.log(`${n} chunks`);
    } catch (err) {
      console.log(`FAILED`);
      console.error(`     ${err.message}`);
      failed.push(label);
    }
  }

  console.log(`\n── Summary ──────────────────────────────────────────`);
  console.log(`  Chapters processed : ${chapters.length - failed.length} / ${chapters.length}`);
  console.log(`  Total chunks stored: ${totalChunks}`);
  if (failed.length > 0) {
    console.log(`  Failed:`);
    failed.forEach(f => console.log(`    ✗ ${f}`));
  }
  console.log('');

  await prisma.$disconnect();
}

main().catch(async err => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
