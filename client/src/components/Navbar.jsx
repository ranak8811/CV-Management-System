import { NavLink, Link, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import useTheme from "../hooks/useTheme";
import useLanguage from "../hooks/useLanguage";
import toast from "react-hot-toast";

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { locale, switchLanguage } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success(locale === "en" ? "Logged out!" : "¡Sesión cerrada!");
    navigate("/");
  };

  const linkClass = ({ isActive }) =>
    `px-3 py-1.5 rounded-md font-bold text-xs transition-all uppercase ${
      isActive
        ? "bg-primary text-primary-content shadow-sm"
        : "text-base-content hover:bg-base-300"
    }`;

  return (
    <div className="bg-base-200 border-b border-base-300 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link
          to="/"
          className="text-sm font-extrabold text-primary tracking-wider uppercase"
        >
          CV Management
        </Link>

        <nav className="hidden md:flex items-center gap-2">
          <NavLink to="/" className={linkClass}>
            Home
          </NavLink>
          <NavLink to="/positions" className={linkClass}>
            Positions
          </NavLink>

          {user && (
            <>
              <NavLink to="/dashboard" end className={linkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/dashboard/profile" className={linkClass}>
                My Profile
              </NavLink>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="btn btn-xs btn-outline btn-neutral"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>

          <button
            onClick={() => switchLanguage(locale === "en" ? "es" : "en")}
            className="btn btn-xs btn-outline btn-neutral font-bold"
          >
            {locale === "en" ? "ES" : "EN"}
          </button>

          {user ? (
            <div className="flex items-center gap-2 border-l border-base-300 pl-3">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name}
                  className="w-7 h-7 rounded-full object-cover border border-primary p-0.5"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold text-xs border border-primary">
                  {user.name ? user.name[0].toUpperCase() : "U"}
                </div>
              )}
              <div className="hidden lg:flex flex-col text-[10px] leading-tight">
                <span className="font-bold text-base-content">{user.name}</span>
                <span className="text-gray-500 font-semibold uppercase">
                  {user.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="btn btn-xs btn-error text-white ml-1"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-xs btn-primary">
              Login
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
