import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const STORAGE_KEY = 'ddh_ui_language';

const LanguageContext = createContext(null);

const readStoredLanguage = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'bn' ? 'bn' : 'en';
};

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(readStoredLanguage);

  const setLanguage = useCallback((nextLanguage) => {
    const resolved = nextLanguage === 'bn' ? 'bn' : 'en';
    localStorage.setItem(STORAGE_KEY, resolved);
    setLanguageState(resolved);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'en' ? 'bn' : 'en');
  }, [language, setLanguage]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage
    }),
    [language, setLanguage, toggleLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguageContext() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguageContext must be used inside LanguageProvider');
  }
  return context;
}
