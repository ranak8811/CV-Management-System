import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import useLanguage from "../hooks/useLanguage";
import useTheme from "../hooks/useTheme";
import toast from "react-hot-toast";

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const { t, locale, switchLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success(locale === "en" ? "Logged out!" : "¡Sesión cerrada!");
    navigate("/");
  };

  const activeSidebarClass = ({ isActive }) =>
    `p-2 rounded font-bold block text-sm transition-all ${
      isActive
        ? "bg-primary text-primary-content shadow-sm"
        : "hover:bg-base-300 text-primary"
    }`;

  return (
    <div className="min-h-screen bg-base-100 text-base-content flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-base-200 border-r border-base-300 p-4 flex flex-col justify-between md:h-screen md:sticky md:top-0 overflow-y-auto">
        <div>
          <Link to={"/"}>
            <h2 className="text-md font-extrabold mb-6 text-primary tracking-wider uppercase">
              {t("dashboardTitle")}
            </h2>
          </Link>

          <nav className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
              Navigation
            </span>

            <NavLink to="/dashboard" end className={activeSidebarClass}>
              Dashboard
            </NavLink>

            <NavLink to="/dashboard/profile" className={activeSidebarClass}>
              My Profile
            </NavLink>

            <NavLink to="/dashboard/positions" className={activeSidebarClass}>
              Positions
            </NavLink>

            {(user?.role === "RECRUITER" || user?.role === "ADMIN") && (
              <NavLink
                to="/dashboard/attributes"
                className={activeSidebarClass}
              >
                Attribute Library
              </NavLink>
            )}

            {user?.role === "ADMIN" && (
              <NavLink to="/dashboard/users" className={activeSidebarClass}>
                Manage Users
              </NavLink>
            )}
          </nav>
        </div>

        <div className="border-t border-base-300 pt-4 mt-6 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            {user?.image ? (
              <img
                src={user.image}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover border border-primary p-0.5"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold text-sm">
                {user?.name ? user.name[0].toUpperCase() : "U"}
              </div>
            )}
            <div className="flex flex-col text-[11px] leading-tight">
              <span className="font-bold text-base-content">{user?.name}</span>
              <span className="text-gray-500 font-semibold uppercase">
                {user?.role}
              </span>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            className="w-full px-3 py-1.5 border border-base-300 rounded-md text-xs bg-base-100 hover:bg-base-300 flex justify-between items-center mt-2"
          >
            <span>Toggle Theme</span>
            <span>{theme === "light" ? "Dark" : "Light"}</span>
          </button>

          <button
            onClick={() => switchLanguage(locale === "en" ? "es" : "en")}
            className="w-full px-3 py-1.5 border border-base-300 rounded-md text-xs bg-base-100 hover:bg-base-300 flex justify-between items-center"
          >
            <span>Language</span>
            <span className="font-bold uppercase">
              {locale === "en" ? "ES" : "EN"}
            </span>
          </button>

          <button
            onClick={handleLogout}
            className="btn btn-xs btn-error text-white w-full mt-2"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto h-screen">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
