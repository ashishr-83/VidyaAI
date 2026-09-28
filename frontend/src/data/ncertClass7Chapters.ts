export interface StaticChapter {
  id: string;
  chapterNumber: number;
  chapterName: string;
  estimatedMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const NCERT_CLASS7_CHAPTERS: Record<string, StaticChapter[]> = {
  Mathematics: [
    { id: 'class7-maths-ch01', chapterNumber: 1, chapterName: 'Large Numbers Around Us',                    estimatedMinutes: 45, difficulty: 'easy'   },
    { id: 'class7-maths-ch02', chapterNumber: 2, chapterName: 'Arithmetic Expressions',                      estimatedMinutes: 50, difficulty: 'medium' },
    { id: 'class7-maths-ch03', chapterNumber: 3, chapterName: 'A Peek Beyond the Point',                    estimatedMinutes: 45, difficulty: 'medium' },
    { id: 'class7-maths-ch04', chapterNumber: 4, chapterName: 'Expressions Using Letter-Numbers',            estimatedMinutes: 55, difficulty: 'medium' },
    { id: 'class7-maths-ch05', chapterNumber: 5, chapterName: 'Parallel and Intersecting Lines',             estimatedMinutes: 40, difficulty: 'easy'   },
    { id: 'class7-maths-ch06', chapterNumber: 6, chapterName: 'Number Play',                                 estimatedMinutes: 40, difficulty: 'easy'   },
    { id: 'class7-maths-ch07', chapterNumber: 7, chapterName: 'A Tale of Three Intersecting Lines',          estimatedMinutes: 50, difficulty: 'medium' },
    { id: 'class7-maths-ch08', chapterNumber: 8, chapterName: 'Working with Fractions',                      estimatedMinutes: 55, difficulty: 'medium' },
  ],

  Science: [
    { id: 'class7-science-ch01', chapterNumber:  1, chapterName: 'The Ever-Evolving World of Science',                      estimatedMinutes:  60, difficulty: 'easy'   },
    { id: 'class7-science-ch02', chapterNumber:  2, chapterName: 'Exploring Substances: Acidic, Basic and Neutral',         estimatedMinutes:  75, difficulty: 'medium' },
    { id: 'class7-science-ch03', chapterNumber:  3, chapterName: 'Electricity: Circuits and Their Components',              estimatedMinutes:  90, difficulty: 'medium' },
    { id: 'class7-science-ch04', chapterNumber:  4, chapterName: 'The World of Metals and Non-Metals',                      estimatedMinutes:  60, difficulty: 'easy'   },
    { id: 'class7-science-ch05', chapterNumber:  5, chapterName: 'Changes Around Us: Physical and Chemical',                estimatedMinutes:  60, difficulty: 'easy'   },
    { id: 'class7-science-ch06', chapterNumber:  6, chapterName: 'Adolescence: A Stage of Growth and Change',               estimatedMinutes:  75, difficulty: 'easy'   },
    { id: 'class7-science-ch07', chapterNumber:  7, chapterName: 'Heat Transfer in Nature',                                  estimatedMinutes:  90, difficulty: 'medium' },
    { id: 'class7-science-ch08', chapterNumber:  8, chapterName: 'Measurement of Time and Motion',                          estimatedMinutes:  60, difficulty: 'easy'   },
    { id: 'class7-science-ch09', chapterNumber:  9, chapterName: 'Life Processes in Animals',                               estimatedMinutes:  90, difficulty: 'medium' },
    { id: 'class7-science-ch10', chapterNumber: 10, chapterName: 'Life Processes in Plants',                                estimatedMinutes:  90, difficulty: 'medium' },
    { id: 'class7-science-ch11', chapterNumber: 11, chapterName: 'Light: Shadows and Reflections',                          estimatedMinutes:  75, difficulty: 'medium' },
    { id: 'class7-science-ch12', chapterNumber: 12, chapterName: 'Earth, Moon and the Sun',                                 estimatedMinutes: 120, difficulty: 'hard'   },
  ],

  'Social Science': [
    { id: 'class7-socsc-ch01', chapterNumber:  1, chapterName: 'Geographical Diversity of India',                    estimatedMinutes: 50, difficulty: 'easy'   },
    { id: 'class7-socsc-ch02', chapterNumber:  2, chapterName: 'Understanding the Weather',                          estimatedMinutes: 40, difficulty: 'easy'   },
    { id: 'class7-socsc-ch03', chapterNumber:  3, chapterName: 'Climates of India',                                  estimatedMinutes: 45, difficulty: 'medium' },
    { id: 'class7-socsc-ch04', chapterNumber:  4, chapterName: 'New Beginnings: Cities and States',                  estimatedMinutes: 50, difficulty: 'medium' },
    { id: 'class7-socsc-ch05', chapterNumber:  5, chapterName: 'The Rise of Empires',                                estimatedMinutes: 55, difficulty: 'medium' },
    { id: 'class7-socsc-ch06', chapterNumber:  6, chapterName: 'The Age of Reorganisation',                          estimatedMinutes: 50, difficulty: 'medium' },
    { id: 'class7-socsc-ch07', chapterNumber:  7, chapterName: 'The Gupta Era: An Age of Tireless Creativity',       estimatedMinutes: 55, difficulty: 'medium' },
    { id: 'class7-socsc-ch08', chapterNumber:  8, chapterName: 'How the Land Becomes Sacred',                        estimatedMinutes: 45, difficulty: 'easy'   },
    { id: 'class7-socsc-ch09', chapterNumber:  9, chapterName: 'From the Rulers to the Ruled: Types of Governments', estimatedMinutes: 50, difficulty: 'medium' },
    { id: 'class7-socsc-ch10', chapterNumber: 10, chapterName: 'The Constitution of India: An Introduction',         estimatedMinutes: 55, difficulty: 'hard'   },
    { id: 'class7-socsc-ch11', chapterNumber: 11, chapterName: 'From Barter to Money',                               estimatedMinutes: 40, difficulty: 'easy'   },
    { id: 'class7-socsc-ch12', chapterNumber: 12, chapterName: 'Understanding Markets',                              estimatedMinutes: 45, difficulty: 'medium' },
  ],
};
