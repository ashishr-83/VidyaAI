import { useCallback, useState } from 'react';
import { DEFAULT_LANGUAGE } from '@/constants/languages';
import { useStorage } from './useStorage';

const LANGUAGE_KEY = 'vidyaai_language';

export function useLanguage() {
  const storage = useStorage();
  const [language, setLanguageState] = useState<string>(
    storage.get(LANGUAGE_KEY) ?? DEFAULT_LANGUAGE
  );

  const setLanguage = useCallback(
    (code: string) => {
      storage.set(LANGUAGE_KEY, code);
      setLanguageState(code);
    },
    [storage]
  );

  return { language, setLanguage };
}
