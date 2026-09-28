/**
 * Run from backend/ with:
 *   npx ts-node --transpile-only scripts/runIngestAll.ts
 *
 * Reads PDFs from the local filesystem (NCERT/ folder) instead of S3,
 * so it works behind Zscaler which intercepts localhost:9000.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';

// Load backend/.env manually (no dotenv dependency needed)
for (const line of readFileSync(join(__dirname, '..', '.env'), 'utf8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq === -1) continue;
  const k = t.slice(0, eq).trim(), v = t.slice(eq + 1).trim();
  if (!process.env[k]) process.env[k] = v;
}

import { prisma } from '../src/lib/prisma';

// ── Config ────────────────────────────────────────────────────────────────────

// Pre-extracted JSON text cache — produced by scripts/extractPdfText.py
const PDF_TEXT_CACHE = join(__dirname, 'pdf_text_cache');
const EMBED_MODEL    = process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small';
const EMBED_DIMS    = parseInt(process.env.EMBEDDING_DIMS ?? '1536', 10);
const CHUNK_TARGET  = 1600;
const CHUNK_OVERLAP = 320;
const CHUNK_MIN     = 240;
const EMBED_BATCH   = 100;
const HEADER_RE     = /^\s*(\d+|Page \d+|NCERT|Chapter \d+|www\.ncert\.nic\.in)\s*$/i;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── chunkText ─────────────────────────────────────────────────────────────────

function chunkText(pages: string[]): { pageNumber: number; chunkIndex: number; text: string }[] {
  const result: { pageNumber: number; chunkIndex: number; text: string }[] = [];
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

async function ingestOne(chapter: {
  id: string; pdfS3Key: string | null;
  subject: string; chapterNumber: number; chapterName: string;
}): Promise<number> {
  if (!chapter.pdfS3Key) throw new Error('No pdfS3Key set');

  // Read pre-extracted text from JSON cache (built by extractPdfText.py)
  // pdfS3Key: "NCERT/Class_7/Mathematics/ch_01_large_numbers_around_us.pdf"
  // → pdf_text_cache/Mathematics/ch_01_large_numbers_around_us.json
  const s3Parts  = chapter.pdfS3Key.split('/');                // ["NCERT","Class_7","Mathematics","ch_01...pdf"]
  const subject  = s3Parts[s3Parts.length - 2]!;              // "Mathematics"
  const filename = s3Parts[s3Parts.length - 1]!.replace(/\.pdf$/, '.json');
  const cachePath = join(PDF_TEXT_CACHE, subject, filename);
  const cache = JSON.parse(readFileSync(cachePath, 'utf-8')) as { pages: string[] };
  const pages = cache.pages;

  // Chunk
  const rawChunks = chunkText(pages);
  if (rawChunks.length === 0) return 0;

  // Embed in batches
  const embedded: Array<typeof rawChunks[0] & { embedding: number[] }> = [];
  for (let i = 0; i < rawChunks.length; i += EMBED_BATCH) {
    const batch = rawChunks.slice(i, i + EMBED_BATCH);
    const res = await openai.embeddings.create({
      model: EMBED_MODEL,
      input: batch.map(c => c.text),
      dimensions: EMBED_DIMS,
    });
    for (let j = 0; j < batch.length; j++) {
      embedded.push({ ...batch[j]!, embedding: res.data[j]!.embedding });
    }
  }

  // Upsert — delete then insert
  await prisma.$executeRawUnsafe(`DELETE FROM "ChapterChunk" WHERE "chapterId" = $1`, chapter.id);
  for (const chunk of embedded) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "ChapterChunk" ("id","chapterId","pageNumber","chunkIndex","text","embedding")
       VALUES ($1,$2,$3,$4,$5,$6::vector)`,
      randomUUID(), chapter.id, chunk.pageNumber, chunk.chunkIndex, chunk.text,
      `[${chunk.embedding.join(',')}]`,
    );
  }

  await prisma.chapterContent.update({ where: { id: chapter.id }, data: { processedAt: new Date() } });
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
  const failed: string[] = [];

  for (const ch of chapters) {
    const label = `${ch.subject} ch${String(ch.chapterNumber).padStart(2, '0')} — ${ch.chapterName}`;
    try {
      process.stdout.write(`  ⏳ ${label} ... `);
      const n = await ingestOne(ch);
      totalChunks += n;
      console.log(`${n} chunks`);
    } catch (err) {
      console.log('FAILED');
      console.error(`     ${(err as Error).message}`);
      failed.push(label);
    }
  }

  console.log(`\n── Summary ──────────────────────────────────────────`);
  console.log(`  Chapters processed : ${chapters.length - failed.length} / ${chapters.length}`);
  console.log(`  Total chunks stored: ${totalChunks}`);
  if (failed.length > 0) {
    console.log('  Failed:');
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
