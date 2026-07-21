import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import useLanguage from "../../hooks/useLanguage";
import useTitle from "../../hooks/useTitle";

const Dashboard = () => {
  useTitle("Dashboard");
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const isSocial = user?.loginMethod === "social";
  const loginMessage = isSocial
    ? t("successMessageSocial")
    : t("successMessageEmail");

  const role = user?.role || "CANDIDATE";

  const handleNavigate = (path) => {
    navigate(path);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-8 animate-fadeIn">
      <div className="relative overflow-hidden bg-linear-to-r from-primary to-secondary p-8 rounded-2xl shadow-lg text-white">
        <div className="relative z-10">
          <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
            {role} Portal
          </span>
          <h2 className="text-3xl font-extrabold mt-3">
            {t("welcome")}, {user?.name || "User"}!
          </h2>
          <p className="text-white/80 text-sm mt-2 max-w-xl">
            Welcome to the CV Management System dashboard. Here you can manage
            profiles, template attributes, positions, and track submitted
            candidate CVs seamlessly.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-1/4 translate-x-1/4">
          <svg className="w-96 h-96" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z" />
          </svg>
        </div>
      </div>

      <div className="bg-base-100 border border-base-300 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-success/10 text-success p-3 rounded-full">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h4 className="font-bold text-base">{t("congratulations")}</h4>
            <p className="text-sm text-base-content/70 mt-0.5">
              {loginMessage}
            </p>
          </div>
        </div>
        <div className="bg-base-200 border border-base-300 px-4 py-2.5 rounded-xl text-xs flex flex-col gap-0.5 w-full md:w-auto">
          <span className="text-base-content/50 font-medium">
            {t("emailLabel")}
          </span>
          <strong className="text-base-content text-sm">{user?.email}</strong>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-base-content/80">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {role === "CANDIDATE" && (
            <>
              <div
                onClick={() => handleNavigate("/dashboard/profile")}
                className="bg-base-100 hover:bg-base-200 border border-base-300 p-6 rounded-2xl transition duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between h-44 shadow-sm"
              >
                <div>
                  <div className="bg-primary/10 text-primary p-2.5 rounded-xl w-fit mb-4">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <h4 className="font-bold text-base">My CV Profile</h4>
                  <p className="text-xs text-base-content/60 mt-1">
                    Update your professional details, image, and tech attributes
                    template.
                  </p>
                </div>
                <span className="text-primary text-xs font-semibold flex items-center gap-1 mt-3">
                  Go to Profile →
                </span>
              </div>

              <div
                onClick={() => handleNavigate("/positions")}
                className="bg-base-100 hover:bg-base-200 border border-base-300 p-6 rounded-2xl transition duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between h-44 shadow-sm"
              >
                <div>
                  <div className="bg-secondary/10 text-secondary p-2.5 rounded-xl w-fit mb-4">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <h4 className="font-bold text-base">Explore Positions</h4>
                  <p className="text-xs text-base-content/60 mt-1">
                    Browse active recruiter openings, required attributes, and
                    verify access eligibility.
                  </p>
                </div>
                <span className="text-secondary text-xs font-semibold flex items-center gap-1 mt-3">
                  Search Positions →
                </span>
              </div>
            </>
          )}

          {(role === "RECRUITER" || role === "ADMIN") && (
            <>
              <div
                onClick={() => handleNavigate("/dashboard/cvs")}
                className="bg-base-100 hover:bg-base-200 border border-base-300 p-6 rounded-2xl transition duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between h-44 shadow-sm"
              >
                <div>
                  <div className="bg-primary/10 text-primary p-2.5 rounded-xl w-fit mb-4">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h4 className="font-bold text-base">Browse CV Registry</h4>
                  <p className="text-xs text-base-content/60 mt-1">
                    Search submitted candidate resumes by tags, attributes,
                    categories, and likes.
                  </p>
                </div>
                <span className="text-primary text-xs font-semibold flex items-center gap-1 mt-3">
                  Open CV Browser →
                </span>
              </div>

              <div
                onClick={() => handleNavigate("/dashboard/positions")}
                className="bg-base-100 hover:bg-base-200 border border-base-300 p-6 rounded-2xl transition duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between h-44 shadow-sm"
              >
                <div>
                  <div className="bg-secondary/10 text-secondary p-2.5 rounded-xl w-fit mb-4">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h4 className="font-bold text-base">Manage Positions</h4>
                  <p className="text-xs text-base-content/60 mt-1">
                    Create openings, duplicate configurations, define templates
                    and access filter rules.
                  </p>
                </div>
                <span className="text-secondary text-xs font-semibold flex items-center gap-1 mt-3">
                  Manage Openings →
                </span>
              </div>

              <div
                onClick={() => handleNavigate("/dashboard/attributes")}
                className="bg-base-100 hover:bg-base-200 border border-base-300 p-6 rounded-2xl transition duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between h-44 shadow-sm"
              >
                <div>
                  <div className="bg-accent/10 text-accent p-2.5 rounded-xl w-fit mb-4">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  </div>
                  <h4 className="font-bold text-base">Attribute Library</h4>
                  <p className="text-xs text-base-content/60 mt-1">
                    Configure global dropdown keys, categories, and datatypes
                    for candidates.
                  </p>
                </div>
                <span className="text-accent text-xs font-semibold flex items-center gap-1 mt-3">
                  Edit Library →
                </span>
              </div>
            </>
          )}

          {role === "ADMIN" && (
            <div
              onClick={() => handleNavigate("/dashboard/users")}
              className="bg-base-100 hover:bg-base-200 border border-base-300 p-6 rounded-2xl transition duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between h-44 shadow-sm"
            >
              <div>
                <div className="bg-warning/10 text-warning-content p-2.5 rounded-xl w-fit mb-4">
                  <svg
                    className="w-6 h-6 text-amber-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
                <h4 className="font-bold text-base">User Registry</h4>
                <p className="text-xs text-base-content/60 mt-1">
                  Block/unblock user accounts, manage permission roles, or
                  delete users.
                </p>
              </div>
              <span className="text-amber-600 text-xs font-semibold flex items-center gap-1 mt-3">
                Manage Users →
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
