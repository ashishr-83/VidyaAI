// MSW handlers for plan and lesson endpoints.
// Import and spread into server.use() overrides in individual tests.

import { http, HttpResponse } from 'msw';

const BASE = 'http://localhost:3000';

// ── Fixture: Class 7 Science chapters (matches backend fixture) ───────────────

export const MOCK_AVAILABLE = {
  available: [
    { classLevel: 7, board: 'CBSE', subjects: ['Science'] },
  ],
};

export const MOCK_CHAPTERS = {
  chapters: [
    { id: 'ch-id-01', chapterNumber: 1, chapterName: 'The Ever-Evolving World of Science', estimatedMinutes: 60, difficulty: 'easy' },
    { id: 'ch-id-02', chapterNumber: 2, chapterName: 'Exploring Substances: Acidic, Basic and Neutral', estimatedMinutes: 75, difficulty: 'medium' },
    { id: 'ch-id-03', chapterNumber: 3, chapterName: 'Electricity: Circuits and Their Components', estimatedMinutes: 90, difficulty: 'medium' },
    { id: 'ch-id-04', chapterNumber: 4, chapterName: 'The World of Metals and Non-Metals', estimatedMinutes: 60, difficulty: 'easy' },
    { id: 'ch-id-05', chapterNumber: 5, chapterName: 'Changes Around Us: Physical and Chemical', estimatedMinutes: 60, difficulty: 'easy' },
    { id: 'ch-id-06', chapterNumber: 6, chapterName: 'Adolescence: A Stage of Growth and Change', estimatedMinutes: 75, difficulty: 'easy' },
    { id: 'ch-id-07', chapterNumber: 7, chapterName: 'Heat Transfer in Nature', estimatedMinutes: 90, difficulty: 'medium' },
    { id: 'ch-id-08', chapterNumber: 8, chapterName: 'Measurement of Time and Motion', estimatedMinutes: 60, difficulty: 'easy' },
    { id: 'ch-id-09', chapterNumber: 9, chapterName: 'Life Processes in Animals', estimatedMinutes: 90, difficulty: 'medium' },
    { id: 'ch-id-10', chapterNumber: 10, chapterName: 'Life Processes in Plants', estimatedMinutes: 90, difficulty: 'medium' },
    { id: 'ch-id-11', chapterNumber: 11, chapterName: 'Light: Shadows and Reflections', estimatedMinutes: 75, difficulty: 'medium' },
    { id: 'ch-id-12', chapterNumber: 12, chapterName: 'Earth, Moon and the Sun', estimatedMinutes: 120, difficulty: 'hard' },
  ],
};

export const MOCK_GENERATED_PLAN = {
  days: [
    {
      chapterName: 'The Ever-Evolving World of Science',
      tasks: [
        { type: 'concept', title: 'Scientific method', conceptExplained: 'Scientific method', question: null, durationMinutes: 20 },
        { type: 'textbook', title: 'Textbook Q1', conceptExplained: null, question: 'What is the scientific method?', durationMinutes: 15 },
      ],
    },
  ],
};

export const MOCK_LESSON_START = {
  sessionId: 'session-id-abc-123',
  message: 'Namaste! Aaj hum Scientific Method padhenge. Pehle batao — science kya hoti hai?',
  taskType: 'concept',
  conceptName: 'Scientific method',
  question: null,
  taskComplete: false,
};

export const MOCK_LESSON_RESPOND = {
  sessionId: 'session-id-abc-123',
  message: 'Bahut accha jawab! Scientific method mein observe karte hain, phir hypothesis banate hain.',
  taskComplete: false,
  comprehensionSignal: 'partial',
  suggestedNextAction: 'ask_followup',
  nextTaskIndex: 0,
};

export const MOCK_LESSON_COMPLETE = {
  ok: true,
  summary: { conceptsLearned: 1, questionsAttempted: 2 },
};

// ── Reusable happy-path handler set ──────────────────────────────────────────

export const planHandlers = [
  http.get(`${BASE}/api/plan/available`, () =>
    HttpResponse.json(MOCK_AVAILABLE)
  ),

  http.get(`${BASE}/api/plan/chapters`, () =>
    HttpResponse.json(MOCK_CHAPTERS)
  ),

  http.post(`${BASE}/api/plan/regenerate`, () =>
    HttpResponse.json({ plan: MOCK_GENERATED_PLAN, fromCache: false })
  ),

  http.get(`${BASE}/api/plan/week`, () =>
    HttpResponse.json({
      planData: { version: 2, generatedPlan: MOCK_GENERATED_PLAN },
      streak: 3,
    })
  ),
];

export const lessonHandlers = [
  http.post(`${BASE}/api/lesson/start`, () =>
    HttpResponse.json(MOCK_LESSON_START)
  ),

  http.post(`${BASE}/api/lesson/respond`, () =>
    HttpResponse.json(MOCK_LESSON_RESPOND)
  ),

  http.post(`${BASE}/api/lesson/complete`, () =>
    HttpResponse.json(MOCK_LESSON_COMPLETE)
  ),
];
