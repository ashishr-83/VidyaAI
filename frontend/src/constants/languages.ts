export interface Language {
  code: string;
  label: string;
  nativeLabel: string;
}

export const LANGUAGES: Language[] = [
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी' },
];

export const DEFAULT_LANGUAGE = 'hi';
