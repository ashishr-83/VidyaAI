# Spec: RAG Pipeline — PDF Ingestion & Chapter Retrieval

**Status:** Ready to build  
**Depends on:** `ChapterContent.pdfS3Key` populated for each chapter  
**Blocks:** `spec-study-plan-deepdive.md` (chapter explanation screen)

---

## 1. What and Why

Students pick chapters in the ChapterPicker. When they open a chapter's deep-dive (explanation, Q&A, practice test), Claude must answer from the actual NCERT PDF — not from training-data recall. Without RAG:
- Explanations drift from the exact NCERT text (unacceptable for exam prep)
- PDF download link and AI explanation refer to different sources
- Hallucination risk on specific NCERT figures, examples, and terminology

The RAG pipeline grounds every Claude response in the chapter's own PDF content.

---

## 2. Architecture Overview

```
PDF on S3
   │
   ▼
[Ingestion Worker]  (one-time per chapter, re-runs if PDF changes)
   │  1. Download PDF from S3
   │  2. Extract text per page (pdf-parse)
   │  3. Chunk into ~400-token overlapping segments
   │  4. Embed each chunk via OpenAI text-embedding-3-small  ← or Voyage AI
   │  5. Upsert into pgvector (ChapterChunk table)
   ▼
pgvector on existing AWS RDS PostgreSQL
   │
   ▼
[Retrieval Service]  (called at query time)
   │  1. Embed the incoming query / section heading
   │  2. cosine similarity search → top-K chunks (K=8 for explanation, K=5 for Q&A)
   │  3. Return chunks with page numbers
   ▼
Claude (claude-sonnet-4-6)
   │  System prompt + retrieved chunks as context
   │  Returns structured JSON (explanation sections / Q&A / exam paper)
   ▼
Frontend
```

---

## 3. Database Schema Addition

Add to `backend/prisma/schema.prisma`:

```prisma
model ChapterChunk {
  id             String   @id @default(uuid())
  chapterId      String                          // FK → ChapterContent.id
  chapterContent ChapterContent @relation(fields: [chapterId], references: [id], onDelete: Cascade)
  pageNumber     Int
  chunkIndex     Int                             // order within chapter
  text           String
  embedding      Unsupported("vector(1536)")     // pgvector; 1536 = text-embedding-3-small dims
  createdAt      DateTime @default(now())

  @@index([chapterId])
}
```

Also add to `ChapterContent`:
```prisma
chunks  ChapterChunk[]
```

Migration command after schema edit:
```bash
# Enable pgvector extension first (run once on DB):
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"

npx prisma migrate dev --name add_chapter_chunks
```

---

## 4. Chunking Strategy

| Parameter | Value | Reason |
|-----------|-------|--------|
| Chunk size | 400 tokens | Fits within Claude's context comfortably; small enough for precise retrieval |
| Overlap | 80 tokens | Avoids splitting mid-sentence at chunk boundaries |
| Splitter | Paragraph → sentence fallback | Prefer splitting at paragraph breaks |
| Minimum chunk | 60 tokens | Discard page headers / footers shorter than this |

Each chunk stored with: `chapterId`, `pageNumber`, `chunkIndex`, `text`, `embedding`.

---

## 5. Embedding Model

**Phase 1 (current):** `text-embedding-3-small` (OpenAI) — 1536 dims, $0.02/1M tokens  
Covers English-medium NCERT subjects: Science, Social Science, Mathematics, English.  
OpenAI embeddings handle English content well; no multilingual overhead needed yet.

**Phase 2 (when Hindi/regional textbooks added):** Evaluate Voyage AI `voyage-3-lite`  
Anthropic's recommended embedding partner; better Devanagari/multilingual retrieval quality.  
Drop-in replacement — same pgvector setup, just swap API key and update `EMBEDDING_DIMS` to 512.

Add to env:
```env
OPENAI_API_KEY=sk-...          # for embeddings only; Claude still uses Anthropic key
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMS=1536
```

---

## 6. Ingestion Worker

**File:** `backend/src/workers/ingestChapter.ts`

**Interface:**
```typescript
async function ingestChapter(chapterId: string): Promise<{ chunksUpserted: number }>
```

**Steps:**
1. Load `ChapterContent` row; confirm `pdfS3Key` is non-null — throw `MISSING_PDF` if not.
2. Download PDF buffer from S3 using existing `backend/src/services/speech.ts` S3 helper pattern.
3. Extract text with `pdf-parse` npm package. Returns `{ text, numpages }`.
4. Split text into chunks (see §4).
5. Batch-embed all chunks — call OpenAI Embeddings API in batches of 100.
6. Upsert into `ChapterChunk` via raw SQL (`INSERT ... ON CONFLICT DO UPDATE`) because Prisma does not natively handle `vector` columns.
7. Mark `ChapterContent.processedAt = now()` so we can tell which chapters are ingested.

**Trigger options (pick one per deploy phase):**
- **Phase A (manual):** `POST /api/admin/ingest/:chapterId` — call after uploading a PDF to S3.
- **Phase B (automatic):** Trigger ingestion in `PUT /api/admin/chapter/:id` when `pdfS3Key` changes.

**New npm packages needed:**
```
pdf-parse        — PDF text extraction
openai           — Embeddings API (not used for generation)
```

---

## 7. Retrieval Service

**File:** `backend/src/services/rag.ts`

```typescript
interface RetrievedChunk {
  text: string;
  pageNumber: number;
  chunkIndex: number;
  similarity: number;
}

async function retrieveChunks(
  chapterId: string,
  query: string,
  topK: number = 8
): Promise<RetrievedChunk[]>
```

**Implementation:**
1. Embed `query` using same embedding model.
2. Run pgvector cosine similarity query:
   ```sql
   SELECT text, page_number, chunk_index,
          1 - (embedding <=> $1::vector) AS similarity
   FROM "ChapterChunk"
   WHERE chapter_id = $2
   ORDER BY embedding <=> $1::vector
   LIMIT $3;
   ```
3. Return chunks sorted by similarity descending.
4. Cache embedding of query in Redis with 1-hour TTL (key: `emb:{sha256(query)}`).

**topK by use case:**
| Use case | topK |
|----------|------|
| Chapter explanation (full chapter) | 20 (retrieve broadly across all sections) |
| Specific concept Q&A | 8 |
| Practice test generation | 15 |

---

## 8. PDF Download Flow

`ChapterContent.pdfS3Key` → generate a pre-signed S3 URL (1-hour expiry) on demand.

**Endpoint:** `GET /api/plan/chapters/:id/pdf-url`  
Returns: `{ url: string, expiresIn: 3600 }`

The ChapterPicker PDF button currently uses a hardcoded local path (`/ncert/class7/...`). After this pipeline is built, it must call this endpoint and open the pre-signed URL.

---

## 9. Acceptance Criteria

- [ ] `ChapterChunk` table created and pgvector extension enabled on test DB
- [ ] Ingestion worker processes a test PDF (≥3 pages) and creates chunks with non-null embeddings
- [ ] Retrieval service returns top-8 chunks for a given query with similarity > 0.7
- [ ] Duplicate ingestion (same chapterId) upserts cleanly without duplicate rows
- [ ] Ingestion worker throws `MISSING_PDF` when `pdfS3Key` is null
- [ ] PDF download endpoint returns a valid pre-signed S3 URL
- [ ] Unit test: chunker splits a 500-word paragraph into correct number of chunks with correct overlap

---

## 10. What This Spec Does NOT Cover

- Hindi query embedding quality tuning (Phase 2 — test with real students first)
- Multi-modal: images/diagrams inside PDFs are not extracted in Phase A (text only)
- Reranking (cross-encoder) — add if retrieval quality is poor after validation
