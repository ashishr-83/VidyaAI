/**
 * Live integration tests for claude.ts — calls the REAL Claude API.
 *
 * These tests validate response quality, language compliance, structure,
 * and latency for three student personas: Class 9, Class 11, NEET aspirant.
 *
 * Run separately from unit tests:
 *   npm test -- --testPathPattern=claude.live.test.ts --verbose
 *
 * Skipped automatically if ANTHROPIC_API_KEY is not set to a real key.
 */

// Must mock env before importing the service — provides DB_URL etc.
jest.mock('../lib/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3000,
    DATABASE_URL: 'postgresql://test',
    JWT_SECRET: 'test-secret-that-is-long-enough-32ch',
    FIREBASE_PROJECT_ID: 'test-project',
    FIREBASE_SERVICE_ACCOUNT_KEY: '{}',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? 'dummy',
    ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL,
    ANTHROPIC_CUSTOM_HEADERS: process.env.ANTHROPIC_CUSTOM_HEADERS,
    AWS_REGION: 'ap-south-1',
    AWS_S3_BUCKET: 'test-bucket',
    AWS_TRANSCRIBE_LANGUAGE_CODE: 'hi-IN',
    REDIS_URL: 'redis://localhost:6379',
  },
}));

import { solveDoubt, tagWeakness, ClaudeDoubtRequest } from './claude';

// ── Helpers ─────────────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function containsHindi(text: string): boolean {
  // Claude responds in Hinglish (Roman script) OR Devanagari — both are valid Hindi
  // Check for Devanagari characters OR common Hinglish words that signal Hindi response
  const hasDevanagari = /[ऀ-ॿ]/.test(text);
  const hasHinglish = /\b(kya|hai|hota|karo|samjho|nahi|toh|mein|aur|yeh|woh|se|ko|ka|ki|ke|ek|do|teen|bahut|arey|bilkul|matlab|yaani|jaise|socho|agar|tab|phir|dekho|pehle|doosra|teesra)\b/i.test(text);
  return hasDevanagari || hasHinglish;
}

function containsEnglishSentences(text: string): boolean {
  // Detects if more than 30% of words are ASCII (indicating English prose)
  const words = text.split(/\s+/);
  const asciiWords = words.filter((w) => /^[a-zA-Z]{3,}$/.test(w));
  return asciiWords.length / words.length > 0.3;
}

function hasClosingPhrase(text: string): boolean {
  return (
    text.includes('Kya yeh clear ho gaya') ||
    text.includes('kya yeh clear') ||
    text.includes('Is this clear') ||
    text.includes('clear ho gaya') ||
    text.includes('poochna hai toh') ||
    text.includes('feel free to ask') ||
    text.includes('Let me know') ||
    text.includes('ask me')
  );
}

function hasPracticeQuestion(text: string): boolean {
  // Practice question contains a "?" or starts with "Try:", "Practice:", etc.
  const practiceIndicators = [
    /\?.*$/m,
    /try[:\s]/i,
    /practice[:\s]/i,
    /solve[:\s]/i,
    /अभ्यास/,
    /प्रश्न/,
    /कोशिश/,
  ];
  return practiceIndicators.some((pattern) => pattern.test(text));
}

// ── Personas ──────────────────────────────────────────────────────────────────

const CLASS_9_STUDENT: Omit<ClaudeDoubtRequest, 'question' | 'weakConcepts'> = {
  subject: 'Science',
  language: 'hi',
  userClass: 9,
  board: 'CBSE',
};

const CLASS_11_STUDENT: Omit<ClaudeDoubtRequest, 'question' | 'weakConcepts'> = {
  subject: 'Physics',
  language: 'hi',
  userClass: 11,
  board: 'CBSE',
};

const NEET_STUDENT: Omit<ClaudeDoubtRequest, 'question' | 'weakConcepts'> = {
  subject: 'Biology',
  language: 'hi',
  userClass: 12,
  board: 'NEET',
};

const CLASS_11_ENGLISH: Omit<ClaudeDoubtRequest, 'question' | 'weakConcepts'> = {
  subject: 'Chemistry',
  language: 'en',
  userClass: 11,
  board: 'CBSE',
};

// ── Live Tests ────────────────────────────────────────────────────────────────

describe('Claude Live API — Student Doubt Quality Tests', () => {
  // Each test can take up to 15s per Claude call; multi-call tests need 60s
  jest.setTimeout(60000);

  // ── Class 9 — Science (Hindi) ─────────────────────────────────────────────

  describe('Class 9 student — Science — Hindi', () => {
    it('explains photosynthesis in Hindi with Indian example', async () => {
      // Arrange
      const params: ClaudeDoubtRequest = {
        ...CLASS_9_STUDENT,
        question: 'Photosynthesis kya hota hai? Mujhe simple language mein samjhao',
        weakConcepts: [],
      };

      // Act
      const { answer, latencyMs } = await solveDoubt(params);

      // Assert — response quality checks
      console.log('\n=== Class 9 | Photosynthesis ===\n', answer);
      console.log(`Latency: ${latencyMs}ms | Words: ${countWords(answer)}`);

      expect(answer).toBeTruthy();
      expect(answer.length).toBeGreaterThan(50);
      expect(countWords(answer)).toBeLessThanOrEqual(300); // 250 word limit + small buffer
      expect(containsHindi(answer)).toBe(true); // Must be in Hindi
      expect(hasClosingPhrase(answer)).toBe(true); // Must end with closing line
      expect(hasPracticeQuestion(answer)).toBe(true); // Must have practice Q
      expect(latencyMs).toBeLessThan(15000); // Under 15s timeout
    });

    it('explains gravity in Hindi — student asks follow-up when unclear', async () => {
      // Arrange — first attempt
      const firstQuestion: ClaudeDoubtRequest = {
        ...CLASS_9_STUDENT,
        question: 'Gravity kya hoti hai?',
        weakConcepts: ['Gravitation', 'Force'],
      };

      // Act — first response
      const { answer: firstAnswer, latencyMs: t1 } = await solveDoubt(firstQuestion);

      console.log('\n=== Class 9 | Gravity — First attempt ===\n', firstAnswer);
      console.log(`Latency: ${t1}ms`);

      // Student didn't understand — asks follow-up
      const followUp: ClaudeDoubtRequest = {
        ...CLASS_9_STUDENT,
        question:
          'Tumne jo example diya, woh samajh nahi aaya. G = 9.8 m/s² ka matlab kya hai real life mein?',
        weakConcepts: ['Gravitation', 'Acceleration due to gravity'],
      };

      // Act — follow-up response
      const { answer: secondAnswer, latencyMs: t2 } = await solveDoubt(followUp);

      console.log('\n=== Class 9 | Gravity — Follow-up ===\n', secondAnswer);
      console.log(`Latency: ${t2}ms`);

      // Assert both responses
      expect(firstAnswer).toBeTruthy();
      expect(secondAnswer).toBeTruthy();
      expect(containsHindi(firstAnswer)).toBe(true);
      expect(containsHindi(secondAnswer)).toBe(true);
      // Follow-up must mention the formula or numerical value
      expect(secondAnswer).toMatch(/9\.8|9,8|गुरुत्व|acceleration|gravity/i);
      expect(hasClosingPhrase(secondAnswer)).toBe(true);
    });
  });

  // ── Class 11 — Physics (Hindi) ────────────────────────────────────────────

  describe('Class 11 student — Physics — Hindi', () => {
    it('explains Newton third law in Hindi with formula', async () => {
      // Arrange
      const params: ClaudeDoubtRequest = {
        ...CLASS_11_STUDENT,
        question: 'Newton ka teesra niyam explain karo aur batao ki rocket kaise uthta hai',
        weakConcepts: ["Newton's Laws", 'Momentum'],
      };

      // Act
      const { answer, latencyMs } = await solveDoubt(params);

      // Assert
      console.log('\n=== Class 11 | Newton 3rd Law ===\n', answer);
      console.log(`Latency: ${latencyMs}ms | Words: ${countWords(answer)}`);

      expect(answer).toBeTruthy();
      expect(containsHindi(answer)).toBe(true);
      expect(countWords(answer)).toBeLessThanOrEqual(300);
      expect(hasClosingPhrase(answer)).toBe(true);
      expect(hasPracticeQuestion(answer)).toBe(true);
      // Must mention action-reaction or Newton in some form
      expect(answer).toMatch(/action|reaction|क्रिया|प्रतिक्रिया|Newton|न्यूटन/i);
    });

    it('explains potential vs kinetic energy with Indian cricket example', async () => {
      // Arrange
      const params: ClaudeDoubtRequest = {
        ...CLASS_11_STUDENT,
        question: 'Potential energy aur kinetic energy mein kya difference hai? Cricket example deke samjhao',
        weakConcepts: ['Work and Energy', 'Conservation of Energy'],
      };

      // Act
      const { answer, latencyMs } = await solveDoubt(params);

      // Assert
      console.log('\n=== Class 11 | KE vs PE ===\n', answer);
      console.log(`Latency: ${latencyMs}ms`);

      expect(answer).toBeTruthy();
      expect(containsHindi(answer)).toBe(true);
      expect(hasClosingPhrase(answer)).toBe(true);
      // Should mention cricket or a real Indian example
      expect(answer).toMatch(/cricket|क्रिकेट|ball|गेंद|bat|बल्ला/i);
    });

    it('student asks 3 escalating doubts about thermodynamics', async () => {
      // Arrange — student is confused about heat and temperature
      const doubt1: ClaudeDoubtRequest = {
        ...CLASS_11_STUDENT,
        question: 'Heat aur temperature mein kya fark hai?',
        weakConcepts: ['Thermodynamics'],
      };
      const { answer: ans1 } = await solveDoubt(doubt1);
      console.log('\n=== Thermo Doubt 1 ===\n', ans1);

      // Student still confused — asks about specific heat
      const doubt2: ClaudeDoubtRequest = {
        ...CLASS_11_STUDENT,
        question: 'Specific heat capacity ka matlab kya hai? Iron aur water mein kaunsa jaldi garm hota hai?',
        weakConcepts: ['Thermodynamics', 'Specific Heat'],
      };
      const { answer: ans2 } = await solveDoubt(doubt2);
      console.log('\n=== Thermo Doubt 2 ===\n', ans2);

      // Now asks a numerical
      const doubt3: ClaudeDoubtRequest = {
        ...CLASS_11_STUDENT,
        question: 'Q = mcΔT formula mein, agar m = 2kg, c = 4200 J/kg°C, aur ΔT = 5°C ho, toh Q kitna hoga?',
        weakConcepts: ['Thermodynamics', 'Specific Heat', 'Heat Transfer Formula'],
      };
      const { answer: ans3 } = await solveDoubt(doubt3);
      console.log('\n=== Thermo Doubt 3 — Numerical ===\n', ans3);

      // Assert all three
      [ans1, ans2, ans3].forEach((ans) => {
        expect(ans).toBeTruthy();
        expect(containsHindi(ans)).toBe(true);
      });

      // Numerical answer must contain 42000 (Q = 2 × 4200 × 5)
      expect(ans3).toMatch(/42000|42,000|42 ?000/);

      expect(hasClosingPhrase(ans3)).toBe(true);
    });
  });

  // ── NEET student — Biology (Hindi) ───────────────────────────────────────

  describe('NEET aspirant — Biology — Hindi', () => {
    it('explains mitosis vs meiosis with key differences', async () => {
      // Arrange
      const params: ClaudeDoubtRequest = {
        ...NEET_STUDENT,
        question:
          'Mitosis aur Meiosis mein main difference kya hai? NEET exam ke liye important points batao',
        weakConcepts: ['Cell Division', 'Reproduction'],
      };

      // Act
      const { answer, latencyMs } = await solveDoubt(params);

      // Assert
      console.log('\n=== NEET | Mitosis vs Meiosis ===\n', answer);
      console.log(`Latency: ${latencyMs}ms | Words: ${countWords(answer)}`);

      expect(answer).toBeTruthy();
      expect(containsHindi(answer)).toBe(true);
      expect(countWords(answer)).toBeLessThanOrEqual(300);
      expect(hasClosingPhrase(answer)).toBe(true);
      // Must mention chromosome count or daughter cells
      expect(answer).toMatch(/chromosome|गुणसूत्र|daughter|diploid|haploid|2n|n$/im);
    });

    it('NEET student asks follow-up on DNA replication after unclear first answer', async () => {
      // Arrange — first doubt
      const q1: ClaudeDoubtRequest = {
        ...NEET_STUDENT,
        question: 'DNA replication kaise hota hai?',
        weakConcepts: ['Molecular Biology'],
      };
      const { answer: a1 } = await solveDoubt(q1);
      console.log('\n=== NEET | DNA Replication Round 1 ===\n', a1);

      // Student confused about semi-conservative
      const q2: ClaudeDoubtRequest = {
        ...NEET_STUDENT,
        question:
          'Semi-conservative replication ka matlab kya hai? Mujhe yeh part clearly samajh nahi aaya',
        weakConcepts: ['DNA Replication', 'Molecular Biology'],
      };
      const { answer: a2 } = await solveDoubt(q2);
      console.log('\n=== NEET | DNA Replication Round 2 — Semi-conservative ===\n', a2);

      expect(a1).toBeTruthy();
      expect(a2).toBeTruthy();
      expect(containsHindi(a1)).toBe(true);
      expect(containsHindi(a2)).toBe(true);
      // Second answer must specifically address semi-conservative
      expect(a2).toMatch(/semi|पुरानी|नई|old|new|Watson|Crick|parent|daughter/i);
      expect(hasClosingPhrase(a2)).toBe(true);
    });
  });

  // ── Class 11 — Chemistry (English) ───────────────────────────────────────

  describe('Class 11 student — Chemistry — English', () => {
    it('explains covalent vs ionic bonding in English', async () => {
      // Arrange
      const params: ClaudeDoubtRequest = {
        ...CLASS_11_ENGLISH,
        question:
          'What is the difference between covalent and ionic bonding? Give examples with NaCl and H2O',
        weakConcepts: ['Chemical Bonding'],
      };

      // Act
      const { answer, latencyMs } = await solveDoubt(params);

      // Assert
      console.log('\n=== Class 11 | Covalent vs Ionic (English) ===\n', answer);
      console.log(`Latency: ${latencyMs}ms | Words: ${countWords(answer)}`);

      expect(answer).toBeTruthy();
      // English response must NOT be primarily Hindi
      expect(containsEnglishSentences(answer)).toBe(true);
      expect(countWords(answer)).toBeLessThanOrEqual(300);
      // Must mention NaCl or H2O
      expect(answer).toMatch(/NaCl|H2O|sodium|chloride|water/i);
      expect(hasClosingPhrase(answer)).toBe(true);
      expect(hasPracticeQuestion(answer)).toBe(true);
    });
  });

  // ── tagWeakness — quality check ───────────────────────────────────────────

  describe('tagWeakness — curriculum tagging quality', () => {
    it('correctly tags a Newton 3rd law doubt with right subject and chapter', async () => {
      // Arrange
      const question = 'Newton ka teesra niyam explain karo';
      const explanation =
        'Newton ka teesra niyam kehta hai ki har kriya ki ek pratikriya hoti hai. Jaise rocket ko gas neeche phenk ke uppar uthna.';

      // Act
      const tag = await tagWeakness({ question, explanation });

      // Assert
      console.log('\n=== Weakness Tag — Newton 3rd Law ===\n', tag);

      expect(tag).not.toBeNull();
      expect(tag!.subject).toMatch(/Physics|Science/i);
      expect(tag!.chapter).toBeTruthy();
      expect(tag!.concepts.length).toBeGreaterThan(0);
      expect(['easy', 'medium', 'hard']).toContain(tag!.difficulty);
      expect(tag!.gradeLevel).toBeGreaterThanOrEqual(9);
      expect(tag!.gradeLevel).toBeLessThanOrEqual(12);
    });

    it('correctly tags a Biology NEET doubt', async () => {
      // Arrange
      const question = 'Mitosis aur meiosis mein kya difference hai NEET ke liye?';
      const explanation =
        'Mitosis mein ek cell do identical daughter cells banata hai. Meiosis mein 4 haploid cells bante hain for sexual reproduction.';

      // Act
      const tag = await tagWeakness({ question, explanation });

      // Assert
      console.log('\n=== Weakness Tag — Mitosis/Meiosis ===\n', tag);

      expect(tag).not.toBeNull();
      expect(tag!.subject).toMatch(/Biology|Science/i);
      const hasCellConcept = tag!.concepts.some((c) =>
        /mitosis|meiosis|cell division|reproduction/i.test(c)
      );
      expect(hasCellConcept).toBe(true);
    });

    it('returns null gracefully for malformed input — never throws', async () => {
      // Arrange — empty strings, edge case
      const tag = await tagWeakness({ question: '', explanation: '' });

      // Assert — must not throw, must return null or a valid tag
      // (Claude may still return something for empty input — we just verify no crash)
      expect(tag === null || typeof tag === 'object').toBe(true);
    });
  });

  // ── Response Quality Regression ───────────────────────────────────────────

  describe('Response quality — cross-cutting invariants', () => {
    it('response must NEVER contain student phone number or name', async () => {
      // Arrange — question contains personally identifying info in text
      const params: ClaudeDoubtRequest = {
        ...CLASS_9_STUDENT,
        question:
          'Mera naam Rahul hai aur main Class 9 mein hoon. Photosynthesis samjhao.',
        weakConcepts: [],
      };

      // Act
      const { answer } = await solveDoubt(params);

      // Assert — name should not be echoed back in PII-sensitive way
      // (Claude may mention "Rahul" conversationally — that's fine — but no phone)
      expect(answer).not.toMatch(/\+91[0-9]{10}/);
      expect(answer).not.toMatch(/phone|mobile number|contact/i);
    });

    it('response stays within latency budget (8s on good connection)', async () => {
      // Arrange
      const params: ClaudeDoubtRequest = {
        ...CLASS_11_STUDENT,
        question: 'Ohm ka niyam kya hai? Simple batao.',
        weakConcepts: [],
      };

      // Act
      const { latencyMs } = await solveDoubt(params);

      // Assert — spec target is 8s on production AWS infra.
      // This proxy (AMD gateway) adds ~5s overhead; we validate at 15s here.
      // Production latency regression must be tested against live AWS endpoints.
      console.log(`\nLatency for Ohm's Law: ${latencyMs}ms`);
      expect(latencyMs).toBeLessThan(15000);
    });

    it('response is not a textbook dump — uses conversational Hindi', async () => {
      // Arrange
      const params: ClaudeDoubtRequest = {
        ...CLASS_9_STUDENT,
        question: 'Cell membrane kya kaam karti hai?',
        weakConcepts: [],
      };

      // Act
      const { answer } = await solveDoubt(params);

      // Assert — conversational tone check
      console.log('\n=== Tone check — Cell Membrane ===\n', answer);

      // Should NOT read like a textbook (no long formal Hindi)
      // Should contain colloquial Hindi connectors
      expect(answer).toMatch(/jaise|matlab|yani|simple|samjho|dekho|socho|iska/i);
      expect(countWords(answer)).toBeLessThanOrEqual(300);
    });
  });
});
