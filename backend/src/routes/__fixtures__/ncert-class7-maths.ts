// Fixture data matching NCERT/Class_7/Mathematics/ PDF filenames exactly.
// Chapter names, estimatedMinutes, and difficulty match frontend/src/data/ncertClass7Chapters.ts.
// Used by plan catalog and plan regenerate tests.

export const CLASS7_MATHS_CHAPTERS = [
  {
    class: 7,
    board: 'CBSE',
    subject: 'Mathematics',
    chapterNumber: 1,
    chapterName: 'Large Numbers Around Us',
    difficulty: 'easy',
    estimatedMinutes: 45,
    concepts: ['Place value', 'Indian number system', 'International number system', 'Estimation'],
    keyFacts: [
      'In the Indian system, periods are ones, thousands, lakhs, crores',
      'In the International system, periods are ones, thousands, millions, billions',
    ],
    textbookQuestions: [
      {
        question: 'What is the place value of 7 in 3,72,819?',
        answer: 'The place value of 7 is 70,000 (seventy thousand).',
      },
    ],
    pdfS3Key: 'NCERT/Class_7/Mathematics/ch_01_large_numbers_around_us.pdf',
  },
  {
    class: 7,
    board: 'CBSE',
    subject: 'Mathematics',
    chapterNumber: 2,
    chapterName: 'Arithmetic Expressions',
    difficulty: 'medium',
    estimatedMinutes: 50,
    concepts: ['BODMAS rule', 'Order of operations', 'Brackets', 'Arithmetic operators'],
    keyFacts: [
      'BODMAS stands for Brackets, Orders, Division, Multiplication, Addition, Subtraction',
      'Multiplication and division are done before addition and subtraction',
    ],
    textbookQuestions: [
      {
        question: 'Simplify: 6 + 2 × 3.',
        answer: 'Using BODMAS, multiply first: 6 + 6 = 12.',
      },
    ],
    pdfS3Key: 'NCERT/Class_7/Mathematics/ch_02_arithmetic_expressions.pdf',
  },
  {
    class: 7,
    board: 'CBSE',
    subject: 'Mathematics',
    chapterNumber: 3,
    chapterName: 'A Peek Beyond the Point',
    difficulty: 'medium',
    estimatedMinutes: 45,
    concepts: ['Decimal numbers', 'Place value of decimals', 'Comparing decimals', 'Operations on decimals'],
    keyFacts: [
      'Digits after the decimal point occupy tenths, hundredths, thousandths places',
      'To compare decimals, align the decimal points and compare digit by digit',
    ],
    textbookQuestions: [
      {
        question: 'Write 3/4 as a decimal.',
        answer: '3 divided by 4 = 0.75.',
      },
    ],
    pdfS3Key: 'NCERT/Class_7/Mathematics/ch_03_a_peek_beyond_the_point.pdf',
  },
  {
    class: 7,
    board: 'CBSE',
    subject: 'Mathematics',
    chapterNumber: 4,
    chapterName: 'Expressions Using Letter-Numbers',
    difficulty: 'medium',
    estimatedMinutes: 55,
    concepts: ['Variables', 'Algebraic expressions', 'Like and unlike terms', 'Simple equations'],
    keyFacts: [
      'A variable represents an unknown quantity',
      'Like terms have the same variable raised to the same power',
    ],
    textbookQuestions: [
      {
        question: 'Write an expression for "5 more than twice a number n".',
        answer: '2n + 5.',
      },
    ],
    pdfS3Key: 'NCERT/Class_7/Mathematics/ch_04_expressions_using_letter-numbers.pdf',
  },
  {
    class: 7,
    board: 'CBSE',
    subject: 'Mathematics',
    chapterNumber: 5,
    chapterName: 'Parallel and Intersecting Lines',
    difficulty: 'easy',
    estimatedMinutes: 40,
    concepts: ['Parallel lines', 'Intersecting lines', 'Perpendicular lines', 'Angles formed by a transversal'],
    keyFacts: [
      'Parallel lines never meet and are equidistant throughout their length',
      'When a transversal cuts two parallel lines, alternate interior angles are equal',
    ],
    textbookQuestions: [
      {
        question: 'What are parallel lines?',
        answer: 'Lines that never meet and are always the same distance apart.',
      },
    ],
    pdfS3Key: 'NCERT/Class_7/Mathematics/ch_05_parallel_and_intersecting_lines.pdf',
  },
  {
    class: 7,
    board: 'CBSE',
    subject: 'Mathematics',
    chapterNumber: 6,
    chapterName: 'Number Play',
    difficulty: 'easy',
    estimatedMinutes: 40,
    concepts: ['Divisibility rules', 'Factors and multiples', 'Prime and composite numbers', 'LCM and HCF'],
    keyFacts: [
      'A prime number has exactly two factors: 1 and itself',
      'LCM × HCF = Product of two numbers',
    ],
    textbookQuestions: [
      {
        question: 'State the divisibility rule for 3.',
        answer: 'A number is divisible by 3 if the sum of its digits is divisible by 3.',
      },
    ],
    pdfS3Key: 'NCERT/Class_7/Mathematics/ch_06_number_play.pdf',
  },
  {
    class: 7,
    board: 'CBSE',
    subject: 'Mathematics',
    chapterNumber: 7,
    chapterName: 'A Tale of Three Intersecting Lines',
    difficulty: 'medium',
    estimatedMinutes: 50,
    concepts: ['Triangle', 'Types of triangles', 'Angle sum property', 'Exterior angle property'],
    keyFacts: [
      'The sum of all interior angles of a triangle is 180°',
      'An exterior angle of a triangle equals the sum of the two non-adjacent interior angles',
    ],
    textbookQuestions: [
      {
        question: 'What is the angle sum property of a triangle?',
        answer: 'The sum of all interior angles of a triangle is 180°.',
      },
    ],
    pdfS3Key: 'NCERT/Class_7/Mathematics/ch_07_a_tale_of_three_intersecting_lines.pdf',
  },
  {
    class: 7,
    board: 'CBSE',
    subject: 'Mathematics',
    chapterNumber: 8,
    chapterName: 'Working with Fractions',
    difficulty: 'medium',
    estimatedMinutes: 55,
    concepts: ['Types of fractions', 'Equivalent fractions', 'Addition and subtraction of fractions', 'Multiplication of fractions'],
    keyFacts: [
      'To add fractions with different denominators, find the LCM first',
      'To multiply fractions, multiply numerators together and denominators together',
    ],
    textbookQuestions: [
      {
        question: 'Add 1/3 and 1/4.',
        answer: 'LCM of 3 and 4 is 12; 4/12 + 3/12 = 7/12.',
      },
    ],
    pdfS3Key: 'NCERT/Class_7/Mathematics/ch_08_working_with_fractions.pdf',
  },
];

// Lightweight version returned by GET /api/plan/chapters
export const CLASS7_MATHS_CHAPTER_LIST = CLASS7_MATHS_CHAPTERS.map((ch) => ({
  chapterNumber: ch.chapterNumber,
  chapterName: ch.chapterName,
  estimatedMinutes: ch.estimatedMinutes,
  difficulty: ch.difficulty,
}));
