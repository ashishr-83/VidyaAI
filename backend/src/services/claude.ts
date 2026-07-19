import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { env } from '../lib/env';
import { logger } from '../lib/logger';
import { AppError } from '../middleware/errorHandler';

function parseCustomHeaders(raw?: string): Record<string, string> {
  if (!raw) return {};
  const headers: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (key) headers[key] = value;
  }
  return headers;
}

const client = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
  ...(env.ANTHROPIC_BASE_URL ? { baseURL: env.ANTHROPIC_BASE_URL } : {}),
  defaultHeaders: parseCustomHeaders(env.ANTHROPIC_CUSTOM_HEADERS),
});

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
const SOLVE_MAX_TOKENS = 600;
const TAG_MAX_TOKENS = 300;
// Production target: 15s. Proxy/test environments may need up to 20s.
const TIMEOUT_MS = Number(process.env.CLAUDE_TIMEOUT_MS ?? 15_000);

export interface WeaknessTag {
  subject: string;
  chapter: string;
  concepts: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  gradeLevel: number;
}

export interface ClaudeDoubtRequest {
  question: string;
  subject: string;
  language: string;
  userClass: number;
  board: string;
  weakConcepts: string[];
}

const weaknessTagSchema = z.object({
  subject: z.string().min(1),
  chapter: z.string().min(1),
  concepts: z.array(z.string()).min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  gradeLevel: z.number().int(),
});

const LANGUAGE_NAMES: Record<string, string> = {
  hi: 'Hindi',
  en: 'English',
  ta: 'Tamil',
  te: 'Telugu',
  kn: 'Kannada',
  mr: 'Marathi',
};

function buildSystemPrompt(params: ClaudeDoubtRequest): string {
  const languageName = LANGUAGE_NAMES[params.language] ?? params.language;
  const weakConceptsStr =
    params.weakConcepts.length > 0 ? params.weakConcepts.join(', ') : 'None identified yet';

  return `You are VidyaAI, a friendly and encouraging AI tutor for Indian students.
You are helping a Class ${params.userClass} student studying ${params.board} curriculum.
The student asked this doubt in ${languageName}.

RULES:
1. Always respond in ${languageName} (simple, conversational — not textbook language)
2. Structure your explanation in 3 parts:
   - First: acknowledge the question in one line
   - Second: explain step-by-step with a real-world Indian example
   - Third: give one practice question to verify understanding
3. If the question involves a formula, write it clearly with each term explained
4. End with: "Kya yeh clear ho gaya? Aur kuch poochna hai toh puchho!" (adapt this line to the student's language — Hindi if hi, English if en)
5. If unclear, ask ONE clarifying question only
6. Tone: warm, like a kind older sibling who is good at studies
7. Maximum 250 words
8. AI voice should be indian female speaker.

Subject: ${params.subject}
Student's known weak concepts: ${weakConceptsStr}`;
}

function buildTaggingPrompt(question: string, explanation: string): string {
  return `Given this student doubt: "${question}"
And this explanation: "${explanation}"

Identify which concepts from NCERT/JEE/NEET curriculum this tests.
Return valid JSON only — no markdown, no explanation:
{
  "subject": "Physics",
  "chapter": "Laws of Motion",
  "concepts": ["Newton's Third Law", "Action-Reaction pairs"],
  "difficulty": "medium",
  "gradeLevel": 11
}`;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new AppError('Claude API timed out', 'AI_ERROR', 502)),
      ms
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

export async function solveDoubt(
  params: ClaudeDoubtRequest
): Promise<{ answer: string; latencyMs: number }> {
  const systemPrompt = buildSystemPrompt(params);
  const start = Date.now();

  const response = await withTimeout(
    client.beta.promptCaching.messages.create({
      model: MODEL,
      max_tokens: SOLVE_MAX_TOKENS,
      system: [
        {
          type: 'text' as const,
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: params.question }],
    }),
    TIMEOUT_MS
  );

  const latencyMs = Date.now() - start;

  logger.info('Claude API call: solveDoubt', {
    latencyMs,
    subject: params.subject,
    language: params.language,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  });

  const block = response.content[0];
  if (!block || block.type !== 'text' || !block.text.trim()) {
    throw new AppError('Empty response from Claude API', 'AI_ERROR', 502);
  }

  return { answer: block.text.trim(), latencyMs };
}

// ── Study Plan Generation ────────────────────────────────────────────────────

export interface StudyPlanTask {
  type: 'concept' | 'textbook' | 'practice' | 'revision';
  title: string;
  durationMinutes: number;
  conceptExplained: string | null;
  question: string | null;
  hint: string | null;
}

export interface StudyPlanDay {
  day: number;
  date: string;
  chapterName: string;
  tasks: StudyPlanTask[];
  totalMinutes: number;
  dayGoal: string;
}

export interface StudyPlanOutput {
  totalDays: number;
  subject: string;
  selectedChapters: string[];
  days: StudyPlanDay[];
  weeklyRevisionDays: number[];
  estimatedCompletionDate: string;
}

export interface ChapterSummaryInput {
  chapterNumber: number;
  chapterName: string;
  concepts: string[];
  textbookQuestions: { question: string; answer: string }[];
  keyFacts: string[];
  estimatedMinutes: number;
  difficulty: string;
}

export interface GenerateStudyPlanRequest {
  userClass: number;
  board: string;
  subject: string;
  dailyMinutes: number;
  language: string;
  chapters: ChapterSummaryInput[];
}

const studyPlanTaskSchema = z.object({
  type: z.enum(['concept', 'textbook', 'practice', 'revision']),
  title: z.string().min(1),
  durationMinutes: z.number().int().min(1),
  conceptExplained: z.string().nullable(),
  question: z.string().nullable(),
  hint: z.string().nullable(),
});

const studyPlanDaySchema = z.object({
  day: z.number().int().min(1),
  date: z.string().min(1),
  chapterName: z.string().min(1),
  tasks: z.array(studyPlanTaskSchema).min(1),
  totalMinutes: z.number().int().min(1),
  dayGoal: z.string().min(1),
});

const StudyPlanOutputSchema = z.object({
  totalDays: z.number().int().min(1),
  subject: z.string().min(1),
  selectedChapters: z.array(z.string()).min(1),
  days: z.array(studyPlanDaySchema).min(1),
  weeklyRevisionDays: z.array(z.number().int()),
  estimatedCompletionDate: z.string().min(1),
});

export async function generateStudyPlan(
  params: GenerateStudyPlanRequest
): Promise<StudyPlanOutput> {
  const languageName = LANGUAGE_NAMES[params.language] ?? params.language;
  const today = new Date().toISOString().slice(0, 10);

  const chaptersSummary = params.chapters
    .map(
      (ch) =>
        `Chapter ${ch.chapterNumber}: ${ch.chapterName}\n` +
        `  Concepts (${ch.concepts.length}): ${ch.concepts.join(', ')}\n` +
        `  Textbook Questions: ${ch.textbookQuestions.length}\n` +
        `  Key Facts: ${ch.keyFacts.length}\n` +
        `  Estimated Time: ${ch.estimatedMinutes} min\n` +
        `  Difficulty: ${ch.difficulty}`
    )
    .join('\n\n');

  const systemPrompt = `You are VidyaAI's study plan generator for Indian students.
You create detailed, day-wise study plans based on actual NCERT chapter content.
Return valid JSON only — no markdown, no explanation.`;

  const userPrompt = `Create a personalised study plan for this student:
- Class: ${params.userClass}, Board: ${params.board}
- Subject: ${params.subject}
- Daily study time available: ${params.dailyMinutes} minutes
- Language preference: ${languageName}
- Today's date: ${today}

Chapters to cover (in order):
${chaptersSummary}

Generate a day-wise JSON plan. Each day must have tasks of these types:
- "concept": explain one concept interactively (15-20 min each)
- "textbook": solve textbook questions together (10 min per question)
- "practice": student attempts practice questions (20-30 min)
- "revision": quick recap of previous day (10-15 min)

Rules:
1. Never put more than 3 concepts in one day
2. Always follow a concept with at least one related textbook question the same day
3. Include a revision task every 3rd day
4. Last day of each chapter must be a full practice session
5. Spread chapters across days — don't front-load
6. Respond in ${languageName}

Return this exact JSON structure:
{
  "totalDays": <number>,
  "subject": "${params.subject}",
  "selectedChapters": [<chapter names>],
  "days": [
    {
      "day": 1,
      "date": "<YYYY-MM-DD starting from today>",
      "chapterName": "<which chapter this day covers>",
      "tasks": [
        {
          "type": "concept|textbook|practice|revision",
          "title": "<specific topic or question>",
          "durationMinutes": <number>,
          "conceptExplained": "<concept name if type=concept, else null>",
          "question": "<the textbook question if type=textbook, else null>",
          "hint": "<one-line hint for practice tasks, else null>"
        }
      ],
      "totalMinutes": <sum of task durations>,
      "dayGoal": "<one sentence — what student will achieve today>"
    }
  ],
  "weeklyRevisionDays": [<day numbers that are revision days>],
  "estimatedCompletionDate": "<YYYY-MM-DD>"
}`;

  const start = Date.now();
  const response = await withTimeout(
    client.beta.promptCaching.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: [
        {
          type: 'text' as const,
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userPrompt }],
    }),
    30_000
  );

  const latencyMs = Date.now() - start;
  logger.info('Claude API call: generateStudyPlan', {
    latencyMs,
    chapters: params.chapters.length,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  });

  const block = response.content[0];
  if (!block || block.type !== 'text' || !block.text.trim()) {
    throw new AppError('Empty response from Claude API', 'AI_ERROR', 502);
  }

  const parsed: unknown = JSON.parse(block.text.trim());
  const validated = StudyPlanOutputSchema.safeParse(parsed);
  if (!validated.success) {
    logger.warn('generateStudyPlan Zod validation failed', { errors: validated.error.flatten() });
    throw new AppError('Invalid study plan structure from AI', 'AI_ERROR', 502);
  }

  return validated.data;
}

// ── Interactive Lesson Session ────────────────────────────────────────────────

export interface LessonTurn {
  message: string;
  taskComplete: boolean;
  comprehensionSignal: 'understood' | 'partial' | 'confused' | 'no_response';
  suggestedNextAction: 'continue' | 'repeat_concept' | 'give_hint' | 'move_on';
}

export interface ClaudeLessonRequest {
  chapterName: string;
  subject: string;
  userClass: number;
  board: string;
  language: string;
  concepts: string[];
  keyFacts: string[];
  taskType: 'concept' | 'textbook' | 'practice' | 'revision';
  conceptName?: string;
  questionText?: string;
  conversationHistory: { role: 'user' | 'assistant'; content: string }[];
}

const LessonTurnSchema = z.object({
  message: z.string().min(1).max(800),
  taskComplete: z.boolean(),
  comprehensionSignal: z.enum(['understood', 'partial', 'confused', 'no_response']),
  suggestedNextAction: z.enum(['continue', 'repeat_concept', 'give_hint', 'move_on']),
});

function buildLessonSystemPrompt(params: ClaudeLessonRequest): string {
  const languageName = LANGUAGE_NAMES[params.language] ?? params.language;
  const conceptsList = params.concepts.join(', ');
  const keyFactsList = params.keyFacts.join('; ');

  return `You are VidyaAI, a warm and encouraging AI teacher for Indian Class ${params.userClass} students.
You are teaching from the NCERT ${params.board} curriculum.
Today's chapter: ${params.chapterName} (${params.subject})

Chapter context you have:
Concepts: ${conceptsList}
Key facts: ${keyFactsList}
Current task type: ${params.taskType}

TEACHING RULES:
1. Respond in ${languageName} — simple conversational language, not textbook language
2. For concept tasks: explain using a real Indian everyday example, then ask "Kya samajh aaya?"
3. For textbook tasks: read the question, give the student 30 seconds to think (say "Socho thoda..."), then guide them to the answer step by step
4. For practice tasks: give ONE question, wait for student answer, give feedback
5. Never give the full answer immediately — always guide with hints first
6. Keep each response under 150 words
7. End every response with either:
   - A question to check understanding (concept/practice tasks)
   - "Sahi jawab!" or correction with explanation (after student answers)
   - "Aaj ka lesson complete!" (when task is done)
8. Track if student understood: if they answer correctly twice → mark task complete
9. Tone: like a kind older sibling — warm, patient, never make student feel bad

IMPORTANT: Always return a valid JSON object (no markdown, no code fences):
{
  "message": "<your teacher response in ${languageName}>",
  "taskComplete": <true|false>,
  "comprehensionSignal": "<understood|partial|confused|no_response>",
  "suggestedNextAction": "<continue|repeat_concept|give_hint|move_on>"
}`;
}

function buildLessonStartPrompt(params: ClaudeLessonRequest): string {
  const parts: string[] = [`Start teaching this task:\nType: ${params.taskType}`];

  if (params.taskType === 'concept' && params.conceptName) {
    parts.push(`Concept to explain: ${params.conceptName}`);
  } else if (params.taskType === 'textbook' && params.questionText) {
    parts.push(`Question to cover: ${params.questionText}`);
  } else if (params.taskType === 'practice') {
    parts.push(`Topic to practice: ${params.conceptName ?? params.chapterName}`);
  } else if (params.taskType === 'revision') {
    parts.push(`Concepts to revise: ${params.concepts.join(', ')}`);
  }

  parts.push('\nBegin the lesson. Greet the student briefly and start teaching immediately.');
  return parts.join('\n');
}

async function callLessonClaude(params: ClaudeLessonRequest, userMessage: string): Promise<LessonTurn> {
  const systemPrompt = buildLessonSystemPrompt(params);

  const messages: Anthropic.MessageParam[] = [
    ...params.conversationHistory.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: userMessage },
  ];

  const start = Date.now();
  const response = await withTimeout(
    client.beta.promptCaching.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: [
        {
          type: 'text' as const,
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
    }),
    TIMEOUT_MS
  );

  const latencyMs = Date.now() - start;
  logger.info('Claude API call: lessonTurn', {
    latencyMs,
    taskType: params.taskType,
    historyLength: params.conversationHistory.length,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  });

  const block = response.content[0];
  if (!block || block.type !== 'text' || !block.text.trim()) {
    throw new AppError('Empty response from Claude API', 'AI_ERROR', 502);
  }

  const parsed: unknown = JSON.parse(block.text.trim());
  const validated = LessonTurnSchema.safeParse(parsed);
  if (!validated.success) {
    logger.warn('lessonTurn Zod validation failed', { errors: validated.error.flatten() });
    throw new AppError('Invalid lesson turn structure from AI', 'AI_ERROR', 502);
  }

  return validated.data;
}

export async function startLessonTurn(params: ClaudeLessonRequest): Promise<LessonTurn> {
  return callLessonClaude(params, buildLessonStartPrompt(params));
}

export async function continueLessonTurn(params: ClaudeLessonRequest): Promise<LessonTurn> {
  // The last message in conversationHistory is the student's message —
  // pop it so we don't double-send, then pass it as the new user message.
  const history = [...params.conversationHistory];
  const lastMessage = history.pop();
  if (!lastMessage || lastMessage.role !== 'user') {
    throw new AppError('Last message in history must be from user', 'BAD_REQUEST', 400);
  }
  return callLessonClaude({ ...params, conversationHistory: history }, lastMessage.content);
}

// ── Weakness Tagging ──────────────────────────────────────────────────────────

export async function tagWeakness(params: {
  question: string;
  explanation: string;
}): Promise<WeaknessTag | null> {
  const start = Date.now();

  try {
    const response = await withTimeout(
      client.beta.promptCaching.messages.create({
        model: MODEL,
        max_tokens: TAG_MAX_TOKENS,
        system: [
          {
            type: 'text' as const,
            text: 'You are a curriculum tagging assistant. Return valid JSON only — no markdown, no explanation.',
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content: buildTaggingPrompt(params.question, params.explanation),
          },
        ],
      }),
      TIMEOUT_MS
    );

    const latencyMs = Date.now() - start;
    logger.info('Claude API call: tagWeakness', {
      latencyMs,
      subject: 'tagging',
      language: 'n/a',
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });

    const block = response.content[0];
    if (!block || block.type !== 'text') return null;

    const parsed: unknown = JSON.parse(block.text.trim());
    const validated = weaknessTagSchema.safeParse(parsed);
    if (!validated.success) return null;

    return validated.data;
  } catch (err) {
    if (err instanceof AppError) {
      logger.warn('tagWeakness timed out or got AI_ERROR', { err: err.message });
      return null;
    }
    logger.warn('tagWeakness failed', { err });
    return null;
  }
}
