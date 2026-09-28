// Fixture data matching NCERT/Class_7/Social Science/ PDF filenames exactly.
// Chapter names, estimatedMinutes, and difficulty match frontend/src/data/ncertClass7Chapters.ts.
// Used by plan catalog tests.

export const CLASS7_SOCSC_CHAPTERS = [
  {
    class: 7,
    board: 'CBSE',
    subject: 'Social Science',
    chapterNumber: 1,
    chapterName: 'Geographical Diversity of India',
    difficulty: 'easy',
    estimatedMinutes: 50,
    concepts: ['Physical features of India', 'Mountains and plains', 'Coastal regions', 'Island territories'],
    keyFacts: [
      'India has the Himalayas in the north and the Indian Ocean in the south',
      'The Deccan Plateau is one of the oldest landmasses in the world',
    ],
    textbookQuestions: [
      {
        question: 'Name the major physical divisions of India.',
        answer: 'India has mountains, plains, plateaus, deserts, and coastal areas as its major physical divisions.',
      },
    ],
    pdfS3Key: 'NCERT/Class_7/SocialScience/ch_01_geographical_diversity_of_india.pdf',
  },
  {
    class: 7,
    board: 'CBSE',
    subject: 'Social Science',
    chapterNumber: 2,
    chapterName: 'Understanding the Weather',
    difficulty: 'easy',
    estimatedMinutes: 40,
    concepts: ['Weather vs climate', 'Temperature', 'Humidity', 'Rainfall measurement'],
    keyFacts: [
      'Weather changes daily; climate is averaged over 30+ years',
      'A rain gauge is used to measure rainfall',
    ],
    textbookQuestions: [
      {
        question: 'What is the difference between weather and climate?',
        answer: 'Weather is the day-to-day condition of the atmosphere; climate is the average weather pattern over a long period.',
      },
    ],
    pdfS3Key: 'NCERT/Class_7/SocialScience/ch_02_understanding_the_weather.pdf',
  },
  {
    class: 7,
    board: 'CBSE',
    subject: 'Social Science',
    chapterNumber: 3,
    chapterName: 'Climates of India',
    difficulty: 'medium',
    estimatedMinutes: 45,
    concepts: ['Monsoon', 'Seasons in India', 'Factors affecting climate', 'Regional climate variations'],
    keyFacts: [
      'India has four main seasons: winter, summer, monsoon, and retreating monsoon',
      'The Western Ghats receive heavy rainfall due to orographic effect',
    ],
    textbookQuestions: [
      {
        question: 'What causes the monsoon in India?',
        answer: 'The monsoon is caused by the seasonal reversal of winds due to differential heating of land and sea.',
      },
    ],
    pdfS3Key: 'NCERT/Class_7/SocialScience/ch_03_climates_of_india.pdf',
  },
  {
    class: 7,
    board: 'CBSE',
    subject: 'Social Science',
    chapterNumber: 4,
    chapterName: 'New Beginnings: Cities and States',
    difficulty: 'medium',
    estimatedMinutes: 50,
    concepts: ['Mahajanapadas', 'Early cities', 'Trade and commerce', 'Social structure'],
    keyFacts: [
      'There were 16 Mahajanapadas in ancient India around 600 BCE',
      'Magadha emerged as the most powerful Mahajanapada',
    ],
    textbookQuestions: [
      {
        question: 'What were Mahajanapadas?',
        answer: 'Mahajanapadas were the sixteen large states or kingdoms that emerged in ancient India around 600 BCE.',
      },
    ],
    pdfS3Key: 'NCERT/Class_7/SocialScience/ch_04_new_beginnings_cities_and_states.pdf',
  },
  {
    class: 7,
    board: 'CBSE',
    subject: 'Social Science',
    chapterNumber: 5,
    chapterName: 'The Rise of Empires',
    difficulty: 'medium',
    estimatedMinutes: 55,
    concepts: ['Maurya Empire', 'Ashoka', 'Administrative system', 'Spread of Buddhism'],
    keyFacts: [
      'Chandragupta Maurya founded the Maurya Empire around 321 BCE',
      'Ashoka renounced violence after the Kalinga war and promoted Buddhism',
    ],
    textbookQuestions: [
      {
        question: 'Who was Ashoka and why is he famous?',
        answer: 'Ashoka was a Mauryan emperor famous for spreading Buddhism and adopting non-violence after the Kalinga war.',
      },
    ],
    pdfS3Key: 'NCERT/Class_7/SocialScience/ch_05_the_rise_of_empires.pdf',
  },
  {
    class: 7,
    board: 'CBSE',
    subject: 'Social Science',
    chapterNumber: 6,
    chapterName: 'The Age of Reorganisation',
    difficulty: 'medium',
    estimatedMinutes: 50,
    concepts: ['Post-Mauryan kingdoms', 'Kushanas', 'Satavahanas', 'Trade routes'],
    keyFacts: [
      'The Kushana king Kanishka was a great patron of Buddhism',
      'Satavahanas were important traders who connected the Deccan to the coast',
    ],
    textbookQuestions: [
      {
        question: 'Name two important kingdoms that rose after the Mauryan empire.',
        answer: 'The Kushana and Satavahana kingdoms were two important post-Mauryan kingdoms.',
      },
    ],
    pdfS3Key: 'NCERT/Class_7/SocialScience/ch_06_the_age_of_reorganisation.pdf',
  },
  {
    class: 7,
    board: 'CBSE',
    subject: 'Social Science',
    chapterNumber: 7,
    chapterName: 'The Gupta Era: An Age of Tireless Creativity',
    difficulty: 'medium',
    estimatedMinutes: 55,
    concepts: ['Gupta dynasty', 'Golden Age of India', 'Art and literature', 'Mathematics and astronomy'],
    keyFacts: [
      'Aryabhata, the mathematician-astronomer, lived during the Gupta period',
      'Kalidasa, author of Shakuntala, flourished under Gupta patronage',
    ],
    textbookQuestions: [
      {
        question: 'Why is the Gupta period called the Golden Age?',
        answer: 'Because of the great achievements in art, literature, science, and mathematics during this era.',
      },
    ],
    pdfS3Key: 'NCERT/Class_7/SocialScience/ch_07_the_gupta_era_an_age_of_tireless_creativity.pdf',
  },
  {
    class: 7,
    board: 'CBSE',
    subject: 'Social Science',
    chapterNumber: 8,
    chapterName: 'How the Land Becomes Sacred',
    difficulty: 'easy',
    estimatedMinutes: 45,
    concepts: ['Pilgrimage sites', 'Temples and shrines', 'Sacred rivers', 'Religious geography'],
    keyFacts: [
      'Rivers like the Ganga are considered sacred in Hinduism',
      'Pilgrimage is an important religious practice in many Indian religions',
    ],
    textbookQuestions: [
      {
        question: 'Why do people go on pilgrimages?',
        answer: 'People go on pilgrimages to visit sacred sites associated with their religion to seek blessings and spiritual merit.',
      },
    ],
    pdfS3Key: 'NCERT/Class_7/SocialScience/ch_08_how_the_land_becomes_sacred.pdf',
  },
  {
    class: 7,
    board: 'CBSE',
    subject: 'Social Science',
    chapterNumber: 9,
    chapterName: 'From the Rulers to the Ruled: Types of Governments',
    difficulty: 'medium',
    estimatedMinutes: 50,
    concepts: ['Democracy', 'Monarchy', 'Republic', 'Forms of government'],
    keyFacts: [
      'In a democracy, power comes from the people through elections',
      'India is a democratic republic — both the head of state and parliament are elected',
    ],
    textbookQuestions: [
      {
        question: 'What is democracy?',
        answer: 'Democracy is a system of government where citizens elect their representatives to govern on their behalf.',
      },
    ],
    pdfS3Key: 'NCERT/Class_7/SocialScience/ch_09_from_the_rulers_to_the_ruled_types_of_governments.pdf',
  },
  {
    class: 7,
    board: 'CBSE',
    subject: 'Social Science',
    chapterNumber: 10,
    chapterName: 'The Constitution of India: An Introduction',
    difficulty: 'hard',
    estimatedMinutes: 55,
    concepts: ['Constitution', 'Fundamental rights', 'Directive principles', 'Preamble'],
    keyFacts: [
      'The Indian Constitution came into effect on 26 January 1950',
      'Part III of the Constitution lists six Fundamental Rights',
    ],
    textbookQuestions: [
      {
        question: 'What is the Preamble to the Indian Constitution?',
        answer: 'The Preamble is the introduction to the Constitution that declares India a Sovereign, Socialist, Secular, Democratic Republic.',
      },
    ],
    pdfS3Key: 'NCERT/Class_7/SocialScience/ch_10_the_constitution_of_india_an_introduction.pdf',
  },
  {
    class: 7,
    board: 'CBSE',
    subject: 'Social Science',
    chapterNumber: 11,
    chapterName: 'From Barter to Money',
    difficulty: 'easy',
    estimatedMinutes: 40,
    concepts: ['Barter system', 'Currency', 'Evolution of money', 'Functions of money'],
    keyFacts: [
      'The barter system required a double coincidence of wants',
      'Money acts as a universally accepted medium of exchange',
    ],
    textbookQuestions: [
      {
        question: 'What are the main functions of money?',
        answer: 'Money acts as a medium of exchange, unit of account, store of value, and standard of deferred payment.',
      },
    ],
    pdfS3Key: 'NCERT/Class_7/SocialScience/ch_11_from_barter_to_money.pdf',
  },
  {
    class: 7,
    board: 'CBSE',
    subject: 'Social Science',
    chapterNumber: 12,
    chapterName: 'Understanding Markets',
    difficulty: 'medium',
    estimatedMinutes: 45,
    concepts: ['Types of markets', 'Supply and demand', 'Price determination', 'Consumer rights'],
    keyFacts: [
      'In a competitive market, prices are determined by supply and demand',
      'Consumer rights include the right to information, choice, and redressal',
    ],
    textbookQuestions: [
      {
        question: 'What is a market?',
        answer: 'A market is any place or mechanism where buyers and sellers interact to exchange goods and services.',
      },
    ],
    pdfS3Key: 'NCERT/Class_7/SocialScience/ch_12_understanding_markets.pdf',
  },
];

// Lightweight version returned by GET /api/plan/chapters
export const CLASS7_SOCSC_CHAPTER_LIST = CLASS7_SOCSC_CHAPTERS.map((ch) => ({
  chapterNumber: ch.chapterNumber,
  chapterName: ch.chapterName,
  estimatedMinutes: ch.estimatedMinutes,
  difficulty: ch.difficulty,
}));
