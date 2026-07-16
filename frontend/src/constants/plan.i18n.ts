export type SupportedLang = 'en' | 'hi' | 'ta' | 'te' | 'kn' | 'mr';

export interface PlanStrings {
  pageTitle: string;
  pageSubtitle: string;
  editPlan: string;
  regenerate: string;
  tabWeek: string;
  tabMonth: string;
  tabSyllabus: string;

  setupTitle: string;
  setupSubtitle: string;
  stepExamTarget: string;
  stepSubjects: string;
  stepSchedule: string;
  stepReminders: string;
  examDateLabel: string;
  classLabel: string;
  boardLabel: string;
  targetScoreLabel: string;
  subjectsTitle: string;
  priorityHint: string;
  scheduleTitle: string;
  studyHoursLabel: string;
  studyDaysLabel: string;
  breakDurationLabel: string;
  sessionLengthLabel: string;
  mockFrequencyLabel: string;
  remindersTitle: string;
  whatsappToggleTitle: string;
  whatsappToggleSub: string;
  whatsappNumberLabel: string;
  reminderTimeLabel: string;
  weeklyParentReport: string;
  weeklyParentSub: string;
  dndTitle: string;
  dndSub: string;
  generateBtn: string;
  generateNote: string;
  generatingBtn: string;
  planReadyBtn: string;

  daysLabel: string;
  hoursLabel: string;
  minsLabel: string;
  examTargetLabel: string;
  syllabusProgressLabel: string;

  thisWeeksPlan: string;
  exportPdf: string;
  restDay: string;
  restDaySub: string;
  rest: string;
  upcoming: string;
  done: string;

  todaysPlan: string;

  typeLearn: string;
  typeRevise: string;
  typePractice: string;
  typeTest: string;

  highPriority: string;
  doubtBtn: string;
  addTask: string;

  streakTitle: string;
  streakSub: string;
  weeklyReport: string;
  totalStudyTime: string;
  tasksCompleted: string;
  doubtsSolved: string;
  mockScore: string;
  weaknessMapTitle: string;
  fullMap: string;
  weaknessWeak: string;
  weaknessMedium: string;
  weaknessStrong: string;
  whatsappReminderTitle: string;
  whatsappReminderSub: string;

  toastGenerated: string;
  toastRegenerated: string;
  toastTaskDone: string;
  toastDoubtOpen: string;
  toastComingSoon: string;
  toastAddTask: string;
}

const en: PlanStrings = {
  pageTitle: '📅 Study Plan',
  pageSubtitle: 'AI-generated daily schedule based on your exam date, subjects, and weak areas',
  editPlan: '⚙️  Edit Plan',
  regenerate: '🔄 Regenerate',
  tabWeek: 'Week View',
  tabMonth: 'Month',
  tabSyllabus: 'Syllabus',

  setupTitle: 'Set Up Your Study Plan',
  setupSubtitle: 'Enter your exam date, subjects and study hours to generate a personalised plan',
  stepExamTarget: 'Exam Target',
  stepSubjects: 'Subjects',
  stepSchedule: 'Schedule',
  stepReminders: 'Reminders',
  examDateLabel: 'Exam Date',
  classLabel: 'Current Class / Grade',
  boardLabel: 'Board / Curriculum',
  targetScoreLabel: 'Target Score / Rank',
  subjectsTitle: 'Subjects & Weak Areas',
  priorityHint: '( Priority dots: 🔴 high → 🟡 medium → 🟢 low )',
  scheduleTitle: 'Daily Schedule Preferences',
  studyHoursLabel: 'Study hours per day',
  studyDaysLabel: 'Which days will you study?',
  breakDurationLabel: 'Short break duration',
  sessionLengthLabel: 'Session length',
  mockFrequencyLabel: 'Mock test frequency',
  remindersTitle: 'Reminders & Notifications',
  whatsappToggleTitle: 'WhatsApp Morning Reminder',
  whatsappToggleSub: "Get today's plan on WhatsApp every morning at 7 AM",
  whatsappNumberLabel: 'WhatsApp Number',
  reminderTimeLabel: 'Reminder Time',
  weeklyParentReport: 'Weekly Progress to Parents',
  weeklyParentSub: "Sunday report to parent's number",
  dndTitle: 'Do Not Disturb Mode',
  dndSub: 'Notifications paused during study sessions',
  generateBtn: '🤖 Generate AI Plan',
  generateNote: 'AI will build your plan based on weak concepts, exam date and available hours',
  generatingBtn: '⏳ Generating...',
  planReadyBtn: '✅ Plan Ready!',

  daysLabel: 'Days',
  hoursLabel: 'Hours',
  minsLabel: 'Mins',
  examTargetLabel: 'Exam Target',
  syllabusProgressLabel: 'Syllabus Progress',

  thisWeeksPlan: "This Week's Plan",
  exportPdf: '📥 Export PDF',
  restDay: 'Rest Day',
  restDaySub: 'Revision only if needed',
  rest: 'Rest',
  upcoming: 'Upcoming',
  done: '✓ Done',

  todaysPlan: "Today's Plan 📋",

  typeLearn: 'Learn',
  typeRevise: 'Revise',
  typePractice: 'Practice',
  typeTest: 'Test',

  highPriority: '🔥 High Priority',
  doubtBtn: '🎤 Ask Doubt',
  addTask: '＋ Add custom task',

  streakTitle: '🔥 Day Streak!',
  streakSub: 'Study tomorrow — {n}-day badge unlocks',
  weeklyReport: "This Week's Report",
  totalStudyTime: 'Total study time',
  tasksCompleted: 'Tasks completed',
  doubtsSolved: 'Doubts solved',
  mockScore: 'Mock test score',
  weaknessMapTitle: 'Concept Weakness Map',
  fullMap: 'Full Map →',
  weaknessWeak: 'Weak',
  weaknessMedium: 'Medium',
  weaknessStrong: 'Strong',
  whatsappReminderTitle: "📱 Tomorrow's WhatsApp Reminder",
  whatsappReminderSub: 'This message will be sent to your number at 7 AM:',

  toastGenerated: '🎯 AI has prepared your personalised plan!',
  toastRegenerated: '🤖 AI has updated your plan!',
  toastTaskDone: '✅ Task complete! Keep going 🔥',
  toastDoubtOpen: '🎤 Opening doubt solver...',
  toastComingSoon: '📅 {tab} view — coming soon!',
  toastAddTask: 'Add custom task — coming soon!',
};

const hi: PlanStrings = {
  pageTitle: '📅 Study Plan',
  pageSubtitle: 'AI-generated daily schedule based on your exam date, subjects, and weak areas',
  editPlan: '⚙️  Plan Edit Karo',
  regenerate: '🔄 Regenerate',
  tabWeek: 'Week View',
  tabMonth: 'Month',
  tabSyllabus: 'Syllabus',

  setupTitle: 'Apna Study Plan Setup Karo',
  setupSubtitle: 'Exam date, subjects aur study hours daal ke personalized plan generate karo',
  stepExamTarget: 'Exam Target',
  stepSubjects: 'Subjects',
  stepSchedule: 'Schedule',
  stepReminders: 'Reminders',
  examDateLabel: 'Exam Date',
  classLabel: 'Current Class / Grade',
  boardLabel: 'Board / Curriculum',
  targetScoreLabel: 'Target Score / Rank',
  subjectsTitle: 'Subjects aur Weak Areas',
  priorityHint: '( Priority dots: 🔴 high → 🟡 medium → 🟢 low )',
  scheduleTitle: 'Daily Schedule Preferences',
  studyHoursLabel: 'Study hours per day',
  studyDaysLabel: 'Kaunse din padhoge?',
  breakDurationLabel: 'Short break duration',
  sessionLengthLabel: 'Session length',
  mockFrequencyLabel: 'Mock test frequency',
  remindersTitle: 'Reminders aur Notifications',
  whatsappToggleTitle: 'WhatsApp Morning Reminder',
  whatsappToggleSub: 'Roz subah 7 baje aaj ka plan WhatsApp pe milega',
  whatsappNumberLabel: 'WhatsApp Number',
  reminderTimeLabel: 'Reminder Time',
  weeklyParentReport: 'Weekly Progress to Parents',
  weeklyParentSub: 'Parent ke number pe Sunday report',
  dndTitle: 'Do Not Disturb Mode',
  dndSub: 'Study sessions ke during notifications band',
  generateBtn: '🤖 AI Plan Generate Karo',
  generateNote: 'AI tumhare weak concepts, exam date aur available hours ke hisaab se plan banayega',
  generatingBtn: '⏳ Generating...',
  planReadyBtn: '✅ Plan Ready!',

  daysLabel: 'Days',
  hoursLabel: 'Hours',
  minsLabel: 'Mins',
  examTargetLabel: 'Exam Target',
  syllabusProgressLabel: 'Syllabus Progress',

  thisWeeksPlan: 'Is Hafte Ka Plan',
  exportPdf: '📥 Export PDF',
  restDay: 'Aaram Ka Din',
  restDaySub: 'Zaroorat ho toh revision karo',
  rest: 'Rest',
  upcoming: 'Upcoming',
  done: '✓ Done',

  todaysPlan: 'Aaj Ka Plan 📋',

  typeLearn: 'Learn',
  typeRevise: 'Revise',
  typePractice: 'Practice',
  typeTest: 'Test',

  highPriority: '🔥 High Priority',
  doubtBtn: '🎤 Doubt Poochho',
  addTask: '＋ Custom task add karo',

  streakTitle: '🔥 Din Ka Streak!',
  streakSub: 'Kal bhi padho — {n} din ka badge milega',
  weeklyReport: 'Is Hafte Ka Report',
  totalStudyTime: 'Total study time',
  tasksCompleted: 'Tasks completed',
  doubtsSolved: 'Doubts solved',
  mockScore: 'Mock test score',
  weaknessMapTitle: 'Concept Weakness Map',
  fullMap: 'Full Map →',
  weaknessWeak: 'Weak',
  weaknessMedium: 'Medium',
  weaknessStrong: 'Strong',
  whatsappReminderTitle: '📱 Kal Ka WhatsApp Reminder',
  whatsappReminderSub: 'Subah 7 baje tumhare number pe yeh message aayega:',

  toastGenerated: '🎯 AI ne tumhara personalized plan tayyar kar diya!',
  toastRegenerated: '🤖 AI ne tumhara plan update kar diya!',
  toastTaskDone: '✅ Task complete! Keep going 🔥',
  toastDoubtOpen: '🎤 Doubt solver open ho raha hai!',
  toastComingSoon: '📅 {tab} view — coming soon!',
  toastAddTask: 'Add custom task — coming soon!',
};

export const planStrings: Record<SupportedLang, PlanStrings> = {
  en,
  hi,
  ta: en as PlanStrings,
  te: en as PlanStrings,
  kn: en as PlanStrings,
  mr: en as PlanStrings,
};
