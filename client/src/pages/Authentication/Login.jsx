import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, Navigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import useAuth from "../../hooks/useAuth";
import useLanguage from "../../hooks/useLanguage";
import useTheme from "../../hooks/useTheme";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { GoogleLogin } from "@react-oauth/google";
import useTitle from "../../hooks/useTitle";

const Login = () => {
  useTitle("Login");
  const { user, handleLoginSuccess } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { locale, switchLanguage } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("verified") === "true") {
      toast.success(
        locale === "en"
          ? "Your email has been verified successfully! You can now log in."
          : "¡Tu correo electrónico ha sido verificado con éxito! Ahora puedes iniciar sesión."
      );
      navigate("/login", { replace: true });
    }
  }, [searchParams, locale, navigate]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm();

  const loginMutation = useMutation({
    mutationFn: async (formData) => {
      const res = await api.post("/api/auth/login", formData);
      return res.data;
    },
    onSuccess: (data) => {
      handleLoginSuccess(data.token, data.user);
      toast.success(
        locale === "en"
          ? "Successfully logged in!"
          : "¡Inicio de sesión exitoso!",
      );
      navigate("/");
    },
    onError: (err) => {
      console.error(err);
      toast.error(err.response?.data?.message || "Invalid email or password");
    },
  });

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
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message || "Google Authentication Failed",
      );
    }
  };

  const handleGitHubLogin = () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/github/callback`;
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`;
  };

  const handleQuickLogin = (email, password) => {
    setValue("email", email);
    setValue("password", password);
  };

  const onSubmit = (data) => {
    loginMutation.mutate(data);
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
          className="px-3 py-1 border border-base-300 rounded bg-base-100 hover:bg-base-300 text-base-content text-xs font-bold uppercase"
        >
          {locale === "en" ? "ES" : "EN"}
        </button>
      </div>

      <div className="border border-base-300 p-8 sm:p-10 rounded-2xl bg-base-100 w-full max-w-md shadow-lg flex flex-col gap-5 mx-4 my-8">
        <h2 className="text-xl font-bold text-center">Sign In</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold">Email Address</label>
            <input
              type="email"
              {...register("email", { required: "Email is required" })}
              className={`input input-bordered w-full input-sm ${errors.email ? "input-error" : ""}`}
              placeholder="name@example.com"
            />
            {errors.email && (
              <span className="text-[10px] text-error font-semibold">
                {errors.email.message}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold">Password</label>
            <input
              type="password"
              {...register("password", { required: "Password is required" })}
              className={`input input-bordered w-full input-sm ${errors.password ? "input-error" : ""}`}
              placeholder="••••••••"
            />
            {errors.password && (
              <span className="text-[10px] text-error font-semibold">
                {errors.password.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="btn btn-primary btn-sm w-full mt-2"
          >
            {loginMutation.isPending ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="border-t border-base-300 pt-4 flex flex-col gap-2">
          <p className="text-[11px] text-gray-500 font-bold text-center mb-0.5">
            Quick Demo Login
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin("alex@gmail.com", "alex#123")}
              className="btn btn-xs bg-base-200 border border-base-300 text-base-content hover:bg-base-300 text-[10px] font-bold uppercase transition-colors"
            >
              Candidate
            </button>
            <button
              type="button"
              onClick={() =>
                handleQuickLogin("recruiter@gmail.com", "recruiter#123")
              }
              className="btn btn-xs bg-base-200 border border-base-300 text-base-content hover:bg-base-300 text-[10px] font-bold uppercase transition-colors"
            >
              Recruiter
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin("admin@gmail.com", "admin#123")}
              className="btn btn-xs bg-base-200 border border-base-300 text-base-content hover:bg-base-300 text-[10px] font-bold uppercase transition-colors"
            >
              Admin
            </button>
          </div>
        </div>

        <p className="text-xs text-center border-t border-base-300 pt-4">
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            className="text-primary font-bold hover:underline"
          >
            Sign Up
          </Link>
        </p>

        <p className="text-gray-400 text-xs text-center">- OR -</p>

        <div className="flex flex-col gap-2">
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error("Google Authentication Failed")}
              useOneTap
            />
          </div>

          <button
            onClick={handleGitHubLogin}
            className="w-full py-1.5 bg-gray-800 text-white rounded font-bold text-xs hover:bg-gray-700 transition"
          >
            Sign in with GitHub
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
