import { useTranslation } from "react-i18next";
import { LanguageContext } from "../context/LanguageContext";

export const LanguageProvider = ({ children }) => {
  const { t, i18n } = useTranslation();

  const switchLanguage = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("locale", lang);
  };

  const languageInfo = {
    locale: i18n.language || "en",
    switchLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={languageInfo}>
      {children}
    </LanguageContext.Provider>
  );
};
