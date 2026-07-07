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
