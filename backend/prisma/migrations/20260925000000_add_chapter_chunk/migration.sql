-- Enable pgvector extension (requires pgvector to be installed on PostgreSQL)
CREATE EXTENSION IF NOT EXISTS vector;

-- ChapterChunk table for RAG pipeline
CREATE TABLE "ChapterChunk" (
  "id"          TEXT NOT NULL,
  "chapterId"   TEXT NOT NULL,
  "pageNumber"  INTEGER NOT NULL,
  "chunkIndex"  INTEGER NOT NULL,
  "text"        TEXT NOT NULL,
  "embedding"   vector(1536) NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChapterChunk_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChapterChunk_chapterId_idx" ON "ChapterChunk"("chapterId");

ALTER TABLE "ChapterChunk"
  ADD CONSTRAINT "ChapterChunk_chapterId_fkey"
  FOREIGN KEY ("chapterId") REFERENCES "ChapterContent"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
