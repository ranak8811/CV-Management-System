import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      welcome: "Welcome",
      logout: "Logout",
      congratulations: "Congratulations!",
      successMessage:
        "You have successfully logged in via social authentication.",
      emailLabel: "Your Email",
      dashboardTitle: "CV Management System Dashboard",
      toggleLanguage: "Switch Language",
      toggleTheme: "Toggle Theme",
    },
  },
  es: {
    translation: {
      welcome: "Bienvenido",
      logout: "Cerrar sesión",
      congratulations: "¡Felicitaciones!",
      successMessage:
        "Ha iniciado sesión con éxito a través de la autenticación social.",
      emailLabel: "Tu correo electrónico",
      dashboardTitle: "Tablero del sistema de gestión de CV",
      toggleLanguage: "Cambiar idioma",
      toggleTheme: "Cambiar tema",
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem("locale") || "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
