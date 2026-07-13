import { LANGUAGES } from '@/constants/languages';
import { useLanguage } from '@/hooks/useLanguage';

export function LanguagePicker() {
  const { language, setLanguage } = useLanguage();

  return (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value)}
      className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      aria-label="Select language"
    >
      {LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.nativeLabel} ({lang.label})
        </option>
      ))}
    </select>
  );
}
