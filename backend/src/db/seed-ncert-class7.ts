// One-time idempotent seed script — safe to re-run.
// Inserts Class 7 CBSE chapters for Mathematics, Science, and Social Science
// into the ChapterContent table. Skips rows that already exist.
//
// Usage: npm run seed:ncert

import { prisma } from '../lib/prisma';
import { CLASS7_SCIENCE_CHAPTERS } from '../routes/__fixtures__/ncert-class7-science';
import { CLASS7_MATHS_CHAPTERS } from '../routes/__fixtures__/ncert-class7-maths';
import { CLASS7_SOCSC_CHAPTERS } from '../routes/__fixtures__/ncert-class7-socsc';

interface ChapterRow {
  class: number;
  board: string;
  subject: string;
  chapterNumber: number;
  chapterName: string;
  difficulty: string;
  estimatedMinutes: number;
  concepts: string[];
  keyFacts: string[];
  textbookQuestions: { question: string; answer: string }[];
  pdfS3Key: string | null;
}

async function main(): Promise<void> {
  const all: ChapterRow[] = [
    ...CLASS7_SCIENCE_CHAPTERS,
    ...CLASS7_MATHS_CHAPTERS,
    ...CLASS7_SOCSC_CHAPTERS,
  ];

  let created = 0;
  let skipped = 0;

  for (const ch of all) {
    const existing = await prisma.chapterContent.findFirst({
      where: {
        class: ch.class,
        board: ch.board,
        subject: ch.subject,
        chapterNumber: ch.chapterNumber,
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.chapterContent.create({
      data: {
        class: ch.class,
        board: ch.board,
        subject: ch.subject,
        chapterNumber: ch.chapterNumber,
        chapterName: ch.chapterName,
        difficulty: ch.difficulty,
        estimatedMinutes: ch.estimatedMinutes,
        concepts: ch.concepts,
        keyFacts: ch.keyFacts,
        textbookQuestions: ch.textbookQuestions,
        pdfS3Key: ch.pdfS3Key,
      },
    });
    created++;
  }

  console.log(`Seed complete — created: ${created}, skipped (already exist): ${skipped}`);
  await prisma.$disconnect();
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
