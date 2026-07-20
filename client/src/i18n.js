import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      welcome: "Welcome",
      logout: "Logout",
      congratulations: "Congratulations!",
      successMessageSocial: "You have successfully logged in via social authentication.",
      successMessageEmail: "You have successfully logged in via email and password.",
      emailLabel: "Your Email",
      dashboardTitle: "CV Management System Dashboard",
      toggleLanguage: "Switch Language",
      toggleTheme: "Toggle Theme",

      save: "Save",
      cancel: "Cancel",
      edit: "Edit",
      delete: "Delete",
      actions: "Actions",
      searchPlaceholder: "Search...",
      selectedRows: "Selected",
      addNew: "Add New",
      duplicate: "Duplicate",

      attributesListTitle: "Attributes Management",
      positionsListTitle: "Positions Management",
      attributeName: "Attribute Name",
      category: "Category",
      dataType: "Data Type",
      isPublic: "Public Access",
      rulesCount: "Rules Defined",

      usersManagementTitle: "Users Management",
      userName: "User Name",
      userEmail: "Email Address",
      userRole: "Role",
      blockUser: "Block User",
      unblockUser: "Unblock User",
      cvsBrowserTitle: "CV Browser",
      candidateName: "Candidate Name",
      cvProfileName: "CV Profile Name",
      appliedPosition: "Applied Position",
      likesCount: "Likes",
      submittedOn: "Submitted On",
    },
  },
  es: {
    translation: {
      welcome: "Bienvenido",
      logout: "Cerrar sesión",
      congratulations: "¡Felicitaciones!",
      successMessageSocial: "Ha iniciado sesión con éxito a través de la autenticación social.",
      successMessageEmail: "Ha iniciado sesión con éxito a través de correo electrónico y contraseña.",
      emailLabel: "Tu correo electrónico",
      dashboardTitle: "Tablero del sistema de gestión de CV",
      toggleLanguage: "Cambiar idioma",
      toggleTheme: "Cambiar tema",

      save: "Guardar",
      cancel: "Cancelar",
      edit: "Editar",
      delete: "Eliminar",
      actions: "Acciones",
      searchPlaceholder: "Buscar...",
      selectedRows: "Seleccionado",
      addNew: "Agregar nuevo",
      duplicate: "Duplicar",

      attributesListTitle: "Gestión de atributos",
      positionsListTitle: "Gestión de posiciones",
      attributeName: "Nombre del atributo",
      category: "Categoría",
      dataType: "Tipo de datos",
      isPublic: "Acceso público",
      rulesCount: "Reglas definidas",

      usersManagementTitle: "Gestión de usuarios",
      userName: "Nombre de usuario",
      userEmail: "Correo electrónico",
      userRole: "Rol",
      blockUser: "Bloquear",
      unblockUser: "Desbloquear",
      cvsBrowserTitle: "Navegador de CV",
      candidateName: "Nombre del candidato",
      cvProfileName: "Nombre del perfil de CV",
      appliedPosition: "Posición aplicada",
      likesCount: "Me gusta",
      submittedOn: "Presentado en",
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
