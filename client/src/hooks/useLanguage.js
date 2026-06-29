import { use } from "react";
import { LanguageContext } from "../context/LanguageContext";

const useLanguage = () => {
  const languageInfo = use(LanguageContext);
  return languageInfo;
};

export default useLanguage;
