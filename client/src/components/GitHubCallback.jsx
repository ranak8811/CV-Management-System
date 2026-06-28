import { useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import api from "../utils/api";
import toast from "react-hot-toast";

const GitHubCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleLoginSuccess } = useAuth();

  const isFetched = useRef(false);

  useEffect(() => {
    if (isFetched.current) return;
    isFetched.current = true;

    const exchangeCode = async () => {
      const code = searchParams.get("code");
      if (code) {
        try {
          const res = await api.post("/api/auth/github", { code });
          if (res.data.success) {
            handleLoginSuccess(res.data.token, res.data.user);
            toast.success("Successfully logged in with GitHub!");
            navigate("/");
          } else {
            toast.error(res.data.message || "GitHub OAuth failed");
            navigate("/login");
          }
        } catch (error) {
          console.error("Error exchanging GitHub code:", error);
          toast.error(
            error.response?.data?.message ||
              "Network Error during GitHub verification",
          );
          navigate("/login");
        }
      } else {
        navigate("/login");
      }
    };

    exchangeCode();
  }, [searchParams, navigate, handleLoginSuccess]);

  return (
    <div className="text-center mt-12 text-lg">
      Authenticating with GitHub, please wait...
    </div>
  );
};

export default GitHubCallback;
