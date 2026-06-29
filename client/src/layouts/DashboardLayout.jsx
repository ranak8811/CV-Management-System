import { Link, Outlet } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import useTheme from "../hooks/useTheme";
import useLanguage from "../hooks/useLanguage";
import toast from "react-hot-toast";

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { locale, switchLanguage, t } = useLanguage();

  const handleLogout = () => {
    logout();
    toast.success(
      locale === "en"
        ? "Logged out successfully!"
        : "¡Sesión cerrada con éxito!",
    );
  };

  return (
    <div className="min-h-screen bg-base-100 text-base-content font-sans transition-colors duration-300">
      <div className="flex flex-col md:flex-row min-h-screen">
        <aside className="w-full md:w-64 bg-base-200 border-r border-base-300 p-4 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold mb-6 text-primary">
              {t("dashboardTitle")}
            </h2>
            <nav className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Navigation
              </span>

              <Link
                to="/dashboard"
                className="p-2 hover:bg-base-300 rounded font-semibold block"
              >
                Dashboard
              </Link>

              {(user?.role === "RECRUITER" || user?.role === "ADMIN") && (
                <Link
                  to="/dashboard/attributes"
                  className="p-2 hover:bg-base-300 rounded font-semibold block text-primary"
                >
                  Attribute Library
                </Link>
              )}
            </nav>
          </div>

          <div className="border-t border-base-300 pt-4 mt-6 flex flex-col gap-3">
            <div className="text-sm">
              {t("welcome")}, <strong>{user?.name || "User"}</strong>
            </div>

            <button
              onClick={toggleTheme}
              className="w-full px-3 py-2 border border-base-300 rounded-md text-sm bg-base-100 hover:bg-base-300 flex justify-between items-center"
            >
              <span>{t("toggleTheme")}</span>
              <span>{theme === "light" ? "Dark" : "Light"}</span>
            </button>

            <button
              onClick={() => switchLanguage(locale === "en" ? "es" : "en")}
              className="w-full px-3 py-2 border border-base-300 rounded-md text-sm bg-base-100 hover:bg-base-300 flex justify-between items-center"
            >
              <span>{t("toggleLanguage")}</span>
              <span className="font-bold uppercase">
                {locale === "en" ? "ES" : "EN"}
              </span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full px-3 py-2 bg-red-650 hover:bg-red-700 text-white rounded-md text-sm font-semibold transition"
            >
              {t("logout")}
            </button>
          </div>
        </aside>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
