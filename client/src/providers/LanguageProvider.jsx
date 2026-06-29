import { useState } from "react";
import { LanguageContext } from "../context/LanguageContext";
import { translations } from "../utils/translations";

export const LanguageProvider = ({ children }) => {
  const [locale, setLocale] = useState(() => {
    return localStorage.getItem("locale") || "en";
  });

  const switchLanguage = (lang) => {
    setLocale(lang);
    localStorage.setItem("locale", lang);
  };

  const t = (key) => {
    return translations[locale]?.[key] || key;
  };

  const languageInfo = { locale, switchLanguage, t };

  return (
    <LanguageContext.Provider value={languageInfo}>
      {children}
    </LanguageContext.Provider>
  );
};
