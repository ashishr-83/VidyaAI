export interface BoardSubjects {
  board: string;
  subjects: string[];
}

export const BOARDS = ['CBSE', 'ICSE', 'STATE', 'JEE', 'NEET'] as const;
export type Board = (typeof BOARDS)[number];

export const CLASSES = [6, 7, 8, 9, 10, 11, 12, 13] as const;
export type ClassLevel = (typeof CLASSES)[number];

export const CLASS_LABELS: Record<number, string> = {
  6: 'Class 6',
  7: 'Class 7',
  8: 'Class 8',
  9: 'Class 9',
  10: 'Class 10',
  11: 'Class 11',
  12: 'Class 12',
  13: 'JEE/NEET Repeater',
};

export const SUBJECTS_BY_BOARD: Record<Board, string[]> = {
  CBSE: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography', 'Economics', 'Computer Science'],
  ICSE: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History & Civics', 'Geography', 'Economics', 'Computer Applications'],
  STATE: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Social Science', 'Computer Science'],
  JEE: ['Physics', 'Chemistry', 'Mathematics'],
  NEET: ['Physics', 'Chemistry', 'Biology'],
};
