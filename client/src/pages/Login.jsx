import { GoogleLogin } from "@react-oauth/google";
import useAuth from "../hooks/useAuth";
import useTheme from "../hooks/useTheme";
import useLanguage from "../hooks/useLanguage";
import { useNavigate, Navigate } from "react-router-dom";
import api from "../utils/api";
import toast from "react-hot-toast";

const Login = () => {
  const { user, handleLoginSuccess } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { locale, switchLanguage } = useLanguage();
  const navigate = useNavigate();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await api.post("/api/auth/google", {
        credential: credentialResponse.credential,
      });

      if (res.data.success) {
        handleLoginSuccess(res.data.token, res.data.user);
        toast.success(
          locale === "en"
            ? "Successfully logged in!"
            : "¡Inicio de sesión exitoso!",
        );
        navigate("/");
      } else {
        toast.error(res.data.message || "Google Login Failed");
      }
    } catch (error) {
      console.error("Google login api call error:", error);
      toast.error(
        error.response?.data?.message || "Network Error during Google login",
      );
    }
  };

  const handleGitHubLogin = () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/github/callback`;
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`;
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-base-200 text-base-content transition-colors duration-300">
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={toggleTheme}
          className="px-3 py-1 border border-base-300 rounded bg-base-100 hover:bg-base-300 text-xs"
        >
          {theme === "light" ? "🌙" : "☀️"}
        </button>
        <button
          onClick={() => switchLanguage(locale === "en" ? "es" : "en")}
          className="px-3 py-1 border border-base-300 rounded bg-base-100 hover:bg-base-300 text-xs font-bold uppercase"
        >
          {locale === "en" ? "ES" : "EN"}
        </button>
      </div>

      <div className="border border-base-300 p-8 rounded-md bg-base-100 w-80 text-center shadow-md">
        <h2 className="text-xl font-bold mb-6 text-base-content">Sign In</h2>

        <div className="flex justify-center mb-4">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => toast.error("Google Authentication Failed")}
            useOneTap
          />
        </div>

        <p className="my-2 text-gray-400 text-xs">- OR -</p>

        <button
          onClick={handleGitHubLogin}
          className="w-full py-2 bg-gray-800 text-white rounded font-bold text-sm hover:bg-gray-700 transition"
        >
          Sign in with GitHub
        </button>
      </div>
    </div>
  );
};

export default Login;
