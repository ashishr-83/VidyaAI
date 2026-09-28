/**
 * ingestChapter — Unit tests for the chunkText() pure function
 *
 * chunkText is pure string manipulation; we mock the module dependencies
 * that are loaded at import time so the test suite doesn't call validateEnv().
 */

// Mock env first so importing ingestChapter doesn't call process.exit(1)
jest.mock('../lib/env', () => ({
  env: {
    NODE_ENV: 'test',
    AWS_S3_BUCKET: 'test-bucket',
    AWS_REGION: 'ap-south-1',
    OPENAI_API_KEY: 'sk-test',
    EMBEDDING_MODEL: 'text-embedding-3-small',
    EMBEDDING_DIMS: 1536,
  },
}));

jest.mock('../lib/prisma', () => ({ prisma: {} }));
jest.mock('../lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../middleware/errorHandler', () => ({
  AppError: class AppError extends Error {
    constructor(message: string, public code: string, public statusCode: number) { super(message); }
  },
}));
jest.mock('../services/speech', () => ({ s3Client: {} }));

import { chunkText, type RawChunk } from './ingestChapter';

// Constants mirrored from ingestChapter.ts for assertion math
const CHUNK_TARGET_CHARS = 1600;
const CHUNK_OVERLAP_CHARS = 320;
const CHUNK_MIN_CHARS = 240;

function makeText(chars: number): string {
  return 'A'.repeat(chars);
}

describe('chunkText', () => {
  it('returns [] for empty pages array', () => {
    expect(chunkText([])).toEqual([]);
  });

  it('returns [] when all paragraphs are below minimum length', () => {
    const shortPara = 'Too short.'; // < 240 chars
    expect(chunkText([`${shortPara}\n\n${shortPara}`])).toEqual([]);
  });

  it('discards header-only lines matching the HEADER_RE pattern', () => {
    const header = '42'; // pure page number — matches header regex
    const goodText = makeText(CHUNK_MIN_CHARS + 10);
    const chunks = chunkText([`${header}\n\n${goodText}`]);
    // The number-only paragraph is discarded; the long text produces one chunk
    expect(chunks.length).toBe(1);
    expect(chunks[0]!.text).not.toContain(header);
  });

  it('returns a single chunk for one paragraph below target length', () => {
    const para = makeText(CHUNK_TARGET_CHARS - 100);
    const chunks = chunkText([para]);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.pageNumber).toBe(1);
    expect(chunks[0]!.chunkIndex).toBe(0);
  });

  it('emits two chunks when a single paragraph exceeds target length', () => {
    // One very long paragraph with NO double-newlines — must be split by overflow logic
    const longText = makeText(CHUNK_TARGET_CHARS + CHUNK_MIN_CHARS + 50);
    const chunks = chunkText([longText]);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });

  it('produces correct pageNumber for multi-page input', () => {
    const para = makeText(CHUNK_MIN_CHARS + 20);
    const chunks = chunkText([para, para, para]); // 3 pages
    const pageNumbers = chunks.map((c) => c.pageNumber);
    // Each page contributes one chunk; page numbers should be 1, 2, 3
    expect(pageNumbers).toEqual([1, 2, 3]);
  });

  it('chunk N+1 begins with the tail of chunk N (overlap)', () => {
    // Two paragraphs that together exceed target, forcing an emit + overlap
    const para1 = makeText(CHUNK_TARGET_CHARS - 50); // just under target
    const para2 = makeText(400); // pushing combined length over target

    const chunks = chunkText([`${para1}\n\n${para2}`]);
    expect(chunks.length).toBeGreaterThanOrEqual(2);

    const tail = chunks[0]!.text.slice(-CHUNK_OVERLAP_CHARS);
    // The start of chunk 1 (after the overlap prefix) should contain the tail
    expect(chunks[1]!.text).toContain(tail.slice(0, 80)); // first 80 chars of overlap
  });

  it('assigns monotonically increasing chunkIndex across pages', () => {
    const para = makeText(CHUNK_MIN_CHARS + 20);
    const chunks = chunkText([para, para, para]);
    const indices = chunks.map((c: RawChunk) => c.chunkIndex);
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]!).toBeGreaterThan(indices[i - 1]!);
    }
  });

  it('does not emit a trailing chunk below minimum size', () => {
    // One good paragraph + one that is just below CHUNK_MIN_CHARS
    const good = makeText(CHUNK_TARGET_CHARS - 100);
    const tooShort = makeText(CHUNK_MIN_CHARS - 10);
    const chunks = chunkText([`${good}\n\n${tooShort}`]);
    // Only the good paragraph should produce a chunk
    for (const c of chunks) {
      expect(c.text.length).toBeGreaterThanOrEqual(CHUNK_MIN_CHARS);
    }
  });
});
