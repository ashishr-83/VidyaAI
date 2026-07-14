# Doubt Solver — Test Prompt Matrix
**For:** Meera (QA)  
**Endpoint:** `POST /api/doubt/solve`  
**Prepared by:** Priya (AI & Prompt Engineer)

---

## API Request Shape

```json
{
  "text": "<student's question>",
  "subject": "<subject>",
  "language": "<hi|en|ta|te|kn|mr>",
  "chapter": "<optional>"
}
```

## Expected Response Shape

```json
{
  "doubtId": "<uuid>",
  "answer": "<Claude explanation>",
  "conceptsTagged": [],
  "audioUrl": "<S3 URL string>"
}
```

---

## Expected Answer Structure (validate ALL 3 parts present)

| Part | What to look for |
|------|-----------------|
| **Part 1 — Acknowledgement** | First sentence acknowledges the question in student's language |
| **Part 2 — Explanation** | Step-by-step explanation with a real Indian example (cricket, tiffin box, vehicles, etc.) |
| **Part 3 — Practice question** | Ends with one practice question for the student |
| **Closing line** | Hindi: "Kya yeh clear ho gaya? Aur kuch poochna hai toh puchho!" / English equivalent |

---

## Test Cases

### TC-01 — Hindi, Physics, Class 11 (Core happy path)

**Request:**
```json
{
  "text": "Newton ka teen kanoon kya hote hain? Simple language mein samjhao",
  "subject": "Physics",
  "chapter": "Laws of Motion",
  "language": "hi"
}
```

**Pass criteria:**
- [ ] `answer` is in Hindi (Devanagari script)
- [ ] Acknowledgement in first line ("Newton ke teen kanoon..." or similar)
- [ ] Explains all 3 laws with an Indian example (cricket ball, auto-rickshaw, etc.)
- [ ] Ends with one practice question
- [ ] Ends with "Kya yeh clear ho gaya? Aur kuch poochna hai toh puchho!"
- [ ] `doubtId` is a valid UUID
- [ ] `audioUrl` is a non-empty string
- [ ] Response ≤ 250 words
- [ ] HTTP 200

---

### TC-02 — English, Maths, Class 10 (Language switch)

**Request:**
```json
{
  "text": "What is the quadratic formula and how do I use it to solve equations?",
  "subject": "Mathematics",
  "chapter": "Quadratic Equations",
  "language": "en"
}
```

**Pass criteria:**
- [ ] `answer` is entirely in English
- [ ] Formula `x = (-b ± √(b²-4ac)) / 2a` is present with each term explained
- [ ] Acknowledgement in first line in English
- [ ] Contains a worked Indian-context example (marks calculation, area of field, etc.)
- [ ] Ends with one practice question in English
- [ ] Ends with English equivalent of the closing line (e.g., "Is this clear? Feel free to ask more!")
- [ ] HTTP 200

---

### TC-03 — Hindi, Chemistry, Class 12 (Formula question)

**Request:**
```json
{
  "text": "Avogadro ka number kya hai aur mole concept kyun important hai?",
  "subject": "Chemistry",
  "chapter": "Mole Concept",
  "language": "hi"
}
```

**Pass criteria:**
- [ ] `answer` in Hindi
- [ ] Avogadro number `6.022 × 10²³` is explicitly stated
- [ ] Mole concept explained with an everyday Indian analogy (dozen eggs, thali, etc.)
- [ ] Practice question included
- [ ] HTTP 200

---

### TC-04 — Vague / Unclear question (Clarification behaviour)

**Request:**
```json
{
  "text": "Physics mein kuch nahi samajh aata",
  "subject": "Physics",
  "language": "hi"
}
```

**Pass criteria:**
- [ ] AI asks exactly ONE clarifying question (not an explanation)
- [ ] Response is in Hindi
- [ ] Does NOT hallucinate a specific topic answer
- [ ] HTTP 200

---

### TC-05 — Short question below min length (Validation rejection)

**Request:**
```json
{
  "text": "help",
  "subject": "Physics",
  "language": "hi"
}
```

**Pass criteria:**
- [ ] HTTP 400
- [ ] Response body contains `{ "error": "...", "code": "..." }`
- [ ] No Claude API call is made (check backend logs — no latency logged)

---

### TC-06 — English, Biology, JEE/NEET context (Board-aware response)

**Request:**
```json
{
  "text": "Explain the process of DNA replication step by step for NEET",
  "subject": "Biology",
  "chapter": "Molecular Basis of Inheritance",
  "language": "en"
}
```

**Pass criteria:**
- [ ] `answer` in English
- [ ] Mentions key enzymes: DNA helicase, DNA polymerase, ligase
- [ ] NEET-appropriate depth (Class 12 level — not oversimplified)
- [ ] Practice question included
- [ ] HTTP 200

---

### TC-07 — Hindi, Maths, missing chapter field (Optional field behaviour)

**Request:**
```json
{
  "text": "Integration aur differentiation mein kya fark hai?",
  "subject": "Mathematics",
  "language": "hi"
}
```

**Pass criteria:**
- [ ] HTTP 200 (chapter is optional — must not error)
- [ ] `answer` in Hindi
- [ ] Both concepts explained with a comparison
- [ ] `doubtId` and `audioUrl` present in response

---

### TC-08 — Free tier quota exhaustion (Rate limiting)

**Setup:** Submit 5 text doubts as a free-tier user, then submit a 6th.

**6th Request:**
```json
{
  "text": "Photosynthesis kya hota hai?",
  "subject": "Biology",
  "language": "hi"
}
```

**Pass criteria:**
- [ ] HTTP 429
- [ ] Error message mentions upgrade to Plus
- [ ] `code` field = `"QUOTA_EXCEEDED"`

---

### TC-09 — Tamil language (Regional language)

**Request:**
```json
{
  "text": "ஒளிச்சேர்க்கை என்றால் என்ன? எளிமையான முறையில் விளக்கவும்",
  "subject": "Biology",
  "chapter": "Photosynthesis",
  "language": "ta"
}
```

**Pass criteria:**
- [ ] `answer` is in Tamil script
- [ ] Acknowledgement in Tamil
- [ ] Explanation includes a practical example
- [ ] HTTP 200

---

### TC-10 — Frontend integration check (End-to-end via UI)

**Steps for Meera (manual, on the Doubt page):**
1. Log in with a test account
2. Navigate to the **Doubt** tab
3. Type: `"Newton ka pehla kanoon kya hai?"` into the text input
4. Select subject: **Physics**, language: **हिंदी**
5. Press Enter / Submit

**Pass criteria (UI):**
- [ ] Loading spinner appears immediately after submit
- [ ] Answer renders within 15 seconds (latency target)
- [ ] Answer text is in Hindi (Devanagari)
- [ ] Audio player appears and plays the TTS response
- [ ] No console errors in browser DevTools
- [ ] Doubt appears in Doubt History page

---

## Backend Log Checks (for each TC that calls Claude)

After running each test case, verify in backend logs (`winston` output):
```
✓ "Claude API call: solveDoubt" log line is present
✓ latencyMs < 15000
✓ inputTokens and outputTokens are non-zero
```

For TC-05 (validation rejection):
```
✓ No "Claude API call" log line — API must NOT be called for invalid input
```

---

## Summary Checklist for Meera

| TC | Scenario | Expected HTTP | Language |
|----|----------|---------------|----------|
| TC-01 | Physics Newton's laws | 200 | Hindi |
| TC-02 | Maths quadratic formula | 200 | English |
| TC-03 | Chemistry mole concept | 200 | Hindi |
| TC-04 | Vague question — clarify | 200 | Hindi |
| TC-05 | Too-short question | 400 | — |
| TC-06 | Biology DNA replication (NEET) | 200 | English |
| TC-07 | No chapter field | 200 | Hindi |
| TC-08 | Free tier quota exceeded | 429 | — |
| TC-09 | Tamil regional language | 200 | Tamil |
| TC-10 | Full frontend E2E | 200 | Hindi |
