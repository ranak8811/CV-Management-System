import { useForm } from "react-hook-form";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import useAuth from "../../hooks/useAuth";
import useLanguage from "../../hooks/useLanguage";
import useTheme from "../../hooks/useTheme";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { useState } from "react";

const Register = () => {
  const { user, handleLoginSuccess } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { locale, switchLanguage } = useLanguage();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const registerMutation = useMutation({
    mutationFn: async (regData) => {
      const res = await api.post("/api/auth/register", regData);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(
        data.message ||
          (locale === "en"
            ? "Registration successful! Please verify your email."
            : "¡Registro exitoso! Por favor verifique su correo electrónico.")
      );
      navigate("/login");
    },
    onError: (err) => {
      console.error(err);
      toast.error(err.response?.data?.message || "Registration failed");
    },
  });

  if (user) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (data) => {
    let imageUrl = "";
    if (data.image && data.image[0]) {
      setUploading(true);
      try {
        const apiKey = import.meta.env.VITE_imgbb_key;
        const formData = new FormData();
        formData.append("image", data.image[0]);

        const response = await fetch(
          `https://api.imgbb.com/1/upload?key=${apiKey}`,
          { method: "POST", body: formData },
        );
        const imgResult = await response.json();
        if (imgResult.success) {
          imageUrl = imgResult.data.url;
        } else {
          toast.error("Image upload failed. Continuing with default avatar.");
        }
      } catch (err) {
        console.error(err);
        toast.error("Photo upload failed. Using blank profile photo.");
      } finally {
        setUploading(false);
      }
    }

    const submissionData = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      image: imageUrl,
    };

    registerMutation.mutate(submissionData);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-8 bg-base-200 text-base-content transition-colors duration-300">
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

      <div className="border border-base-300 p-8 rounded-md bg-base-100 w-96 shadow-md flex flex-col gap-5">
        <h2 className="text-xl font-bold text-center">Create Account</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold">First Name</label>
              <input
                type="text"
                {...register("firstName", {
                  required: "First name is required",
                })}
                className={`input input-bordered w-full input-sm ${errors.firstName ? "input-error" : ""}`}
                placeholder="John"
              />
              {errors.firstName && (
                <span className="text-[10px] text-error font-semibold">
                  {errors.firstName.message}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold">Last Name</label>
              <input
                type="text"
                {...register("lastName", { required: "Last name is required" })}
                className={`input input-bordered w-full input-sm ${errors.lastName ? "input-error" : ""}`}
                placeholder="Doe"
              />
              {errors.lastName && (
                <span className="text-[10px] text-error font-semibold">
                  {errors.lastName.message}
                </span>
              )}
            </div>
          </div>

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
              {...register("password", {
                required: "Password is required",
                minLength: { value: 6, message: "Minimum 6 characters" },
              })}
              className={`input input-bordered w-full input-sm ${errors.password ? "input-error" : ""}`}
              placeholder="••••••••"
            />
            {errors.password && (
              <span className="text-[10px] text-error font-semibold">
                {errors.password.message}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold">
              Personal Photo (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              {...register("image")}
              className="file-input file-input-bordered file-input-sm w-full"
            />
          </div>

          <button
            type="submit"
            disabled={registerMutation.isPending || uploading}
            className="btn btn-primary btn-sm w-full mt-2"
          >
            {uploading
              ? "Uploading photo..."
              : registerMutation.isPending
                ? "Creating Account..."
                : "Register"}
          </button>
        </form>

        <p className="text-xs text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-bold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
