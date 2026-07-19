import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const prisma = new PrismaClient();

// ── Expected folder layout ────────────────────────────────────────────────────
// NCERT/
//   Class_7/
//     Science/   ← subject folder, contains ch_*.pdf files
//     Maths/
//   Class_8/
//     Science/
//   Class_11/
//     Physics/
// Any new class/subject folder dropped here is auto-discovered.

const NCERT_ROOT = path.resolve(__dirname, '../../NCERT');
const BOARD = 'CBSE'; // all NCERT books are CBSE

const ChapterContentSchema = z.object({
  chapterNumber: z.number().int().min(0),
  chapterName: z.string().min(1),
  concepts: z.array(z.string().min(1)).min(1),
  textbookQuestions: z.array(
    z.object({
      question: z.string().min(1),
      answer: z.string().min(1),
    })
  ),
  keyFacts: z.array(z.string().min(1)).min(1),
  estimatedMinutes: z.number().int().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

type ChapterContent = z.infer<typeof ChapterContentSchema>;

interface PdfTarget {
  pdfPath: string;
  classLevel: number;
  subject: string;
  filename: string;
}

// ── Directory walker ──────────────────────────────────────────────────────────

function discoverPdfs(): PdfTarget[] {
  if (!fs.existsSync(NCERT_ROOT)) {
    console.error(`NCERT root not found: ${NCERT_ROOT}`);
    process.exit(1);
  }

  const targets: PdfTarget[] = [];

  // List Class_N folders
  const classDirs = fs
    .readdirSync(NCERT_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^Class_\d+$/i.test(d.name));

  for (const classDir of classDirs) {
    const classMatch = classDir.name.match(/Class_(\d+)/i);
    if (!classMatch) continue;
    const classLevel = parseInt(classMatch[1], 10);
    const classPath = path.join(NCERT_ROOT, classDir.name);

    // List subject folders inside each class folder
    const subjectDirs = fs
      .readdirSync(classPath, { withFileTypes: true })
      .filter((d) => d.isDirectory());

    for (const subjectDir of subjectDirs) {
      const subject = subjectDir.name; // e.g. "Science", "Maths", "Physics"
      const subjectPath = path.join(classPath, subjectDir.name);

      const pdfFiles = fs
        .readdirSync(subjectPath)
        .filter((f) => f.toLowerCase().endsWith('.pdf'))
        .sort();

      for (const filename of pdfFiles) {
        targets.push({
          pdfPath: path.join(subjectPath, filename),
          classLevel,
          subject,
          filename,
        });
      }
    }
  }

  return targets;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function chapterNumberFromFilename(filename: string): number {
  const match = filename.match(/ch_(\d+)/i);
  return match ? parseInt(match[1], 10) : 0;
}

function s3Key(classLevel: number, subject: string, filename: string, hash: string): string {
  const classSlug = `class${classLevel}`;
  const subjectSlug = subject.toLowerCase().replace(/\s+/g, '_');
  const base = filename.replace(/\.pdf$/i, '');
  return `ncert/${classSlug}/${subjectSlug}/${base}_${hash}.pdf`;
}

// ── Claude extraction ─────────────────────────────────────────────────────────

async function extractChapter(target: PdfTarget): Promise<ChapterContent> {
  const pdfBytes = fs.readFileSync(target.pdfPath);
  const base64Pdf = pdfBytes.toString('base64');
  const chapterNumber = chapterNumberFromFilename(target.filename);

  const response = await client.beta.promptCaching.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        text: 'You are a curriculum extraction assistant for Indian NCERT textbooks.\nExtract structured content from the provided PDF chapter.\nReturn valid JSON only — no markdown, no explanation, no code fences.',
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64Pdf },
          } as Anthropic.DocumentBlockParam,
          {
            type: 'text',
            text: `Extract the following from this NCERT Class ${target.classLevel} ${target.subject} chapter PDF:
{
  "chapterNumber": ${chapterNumber},
  "chapterName": "<full chapter title as it appears in the PDF>",
  "concepts": ["<list of 8-15 key concepts taught in this chapter>"],
  "textbookQuestions": [
    { "question": "<exact question from the textbook>", "answer": "<concise answer in 2-3 sentences>" }
  ],
  "keyFacts": ["<list of 6-10 important facts a student must remember>"],
  "estimatedMinutes": <realistic study time in minutes for a Class ${target.classLevel} student, typically 60-180>,
  "difficulty": "<easy|medium|hard based on concept complexity>"
}

Rules:
- concepts: extract what's actually taught, not chapter headings
- textbookQuestions: include ALL questions from the "Questions" or "Exercises" section
- keyFacts: short, memorable statements — not full sentences from the text
- estimatedMinutes: assume 1 concept = 10 minutes + 5 min per textbook question
- Return ONLY the JSON object, nothing else`,
          },
        ],
      },
    ],
  });

  const block = response.content[0];
  if (!block || block.type !== 'text') {
    throw new Error(`No text response from Claude for ${target.filename}`);
  }

  const parsed: unknown = JSON.parse(block.text.trim());
  return ChapterContentSchema.parse(parsed);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const targets = discoverPdfs();

  if (targets.length === 0) {
    console.log('No PDFs found under NCERT/. Add folders like NCERT/Class_7/Science/ and try again.');
    return;
  }

  // Print discovery summary grouped by class/subject
  const groups = new Map<string, number>();
  for (const t of targets) {
    const key = `Class ${t.classLevel} — ${t.subject}`;
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  console.log(`\nDiscovered ${targets.length} PDF(s) across ${groups.size} class/subject group(s):`);
  for (const [label, count] of groups) {
    console.log(`  ${label}: ${count} chapter(s)`);
  }
  console.log('');

  let ok = 0;
  let failed = 0;

  for (const target of targets) {
    const label = `[Class ${target.classLevel} / ${target.subject}] ${target.filename}`;
    console.log(`Processing: ${label}`);

    try {
      const content = await extractChapter(target);

      const hash = crypto
        .createHash('md5')
        .update(fs.readFileSync(target.pdfPath))
        .digest('hex')
        .slice(0, 8);

      await prisma.chapterContent.upsert({
        where: {
          class_board_subject_chapterNumber: {
            class: target.classLevel,
            board: BOARD,
            subject: target.subject,
            chapterNumber: content.chapterNumber,
          },
        },
        update: {
          chapterName: content.chapterName,
          concepts: content.concepts,
          textbookQuestions: content.textbookQuestions,
          keyFacts: content.keyFacts,
          estimatedMinutes: content.estimatedMinutes,
          difficulty: content.difficulty,
          pdfS3Key: s3Key(target.classLevel, target.subject, target.filename, hash),
          processedAt: new Date(),
        },
        create: {
          class: target.classLevel,
          board: BOARD,
          subject: target.subject,
          chapterNumber: content.chapterNumber,
          chapterName: content.chapterName,
          concepts: content.concepts,
          textbookQuestions: content.textbookQuestions,
          keyFacts: content.keyFacts,
          estimatedMinutes: content.estimatedMinutes,
          difficulty: content.difficulty,
          pdfS3Key: s3Key(target.classLevel, target.subject, target.filename, hash),
        },
      });

      console.log(
        `  ✅ ${content.chapterName} — ${content.concepts.length} concepts, ${content.textbookQuestions.length} questions`
      );
      ok++;
    } catch (err) {
      console.error(`  ❌ Failed: ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  await prisma.$disconnect();
  console.log(`\nDone. ✅ ${ok} extracted, ❌ ${failed} failed.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
