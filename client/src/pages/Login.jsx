import { Navigate, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { toast } from "react-hot-toast";
import api from "../utils/api";
import { GoogleLogin } from "@react-oauth/google";

const Login = () => {
  const { user, handleLoginSuccess } = useAuth();
  const navigate = useNavigate();

  if (user) {
    return <Navigate to={"/"} replace />;
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await api.post("/api/auth/google", {
        credential: credentialResponse.credential,
      });

      if (res.data.success) {
        handleLoginSuccess(res.data.token, res.data.user);
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
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="border border-gray-300 p-8 rounded-md bg-white w-80 text-center">
        <h2 className="text-xl font-bold mb-6 text-gray-700">Sing In</h2>

        <div className="flex justify-center mb-4">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => toast.error("Google Authentication Failed")}
            useOneTap
          />
        </div>

        <p className="my-2 text-gray-400 text-xs">- OR -</p>

        <button
          className="w-full py-2 bg-gray-800 text-white rounded font-bold text-sm hover:bg-gray-700"
          onClick={handleGitHubLogin}
        >
          Sign in with Github
        </button>
      </div>
    </div>
  );
};

export default Login;
