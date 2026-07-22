import { useState } from "react";
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
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogout = () => {
    logout();
    toast.success(locale === "en" ? "Logged out!" : "¡Sesión cerrada!");
    navigate("/");
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    if (user && (user.role === "RECRUITER" || user.role === "ADMIN")) {
      navigate(`/dashboard/cvs?search=${encodeURIComponent(trimmed)}`);
    } else if (user) {
      navigate(`/dashboard/positions?search=${encodeURIComponent(trimmed)}`);
    } else {
      navigate(`/positions?search=${encodeURIComponent(trimmed)}`);
    }
    setSearchQuery("");
  };

  const linkClass = ({ isActive }) =>
    `px-3.5 py-1.5 rounded-md font-bold text-xs transition-all uppercase whitespace-nowrap ${
      isActive
        ? "bg-primary text-primary-content shadow-sm"
        : "text-base-content hover:bg-base-300"
    }`;

  return (
    <div className="bg-base-200 border-b border-base-300 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="text-sm font-extrabold text-primary tracking-wider uppercase flex-shrink-0"
          >
            CV Management
          </Link>

          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex items-center bg-base-100 border border-base-300 rounded px-3 py-1.5 h-8.5 w-64 lg:w-72"
          >
            <input
              type="text"
              placeholder="Search positions/CVs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-[11px] focus:outline-none w-full placeholder:text-gray-400"
            />
            <button
              type="submit"
              className="text-gray-400 hover:text-base-content text-xs"
            >
              🔍
            </button>
          </form>
        </div>

        <div className="flex items-center gap-3">
          <nav className="hidden lg:flex items-center gap-2 mr-2">
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

          <button
            onClick={toggleTheme}
            className="px-2.5 py-1 border border-base-300 rounded bg-base-100 hover:bg-base-300 text-base-content text-xs transition-colors"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>

          <button
            onClick={() => switchLanguage(locale === "en" ? "es" : "en")}
            className="px-2.5 py-1 border border-base-300 rounded bg-base-100 hover:bg-base-300 text-base-content text-xs font-bold uppercase transition-colors"
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
