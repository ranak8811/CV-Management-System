import { useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import api from "../utils/api";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLoggedInUser = async () => {
      const token = localStorage.getItem("token");

      if (token) {
        try {
          const res = await api.get("/api/auth/profile");

          if (res.data.success) {
            setUser(res.data.user);
          } else {
            localStorage.removeItem("token");
          }
        } catch (error) {
          console.error("Error verifying token:", error);
          localStorage.removeItem("token");
        }
      }

      setLoading(false);
    };
    checkLoggedInUser();
  }, []);

  const handleLoginSuccess = (token, userData) => {
    localStorage.setItem("token", token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const authInfo = { user, loading, handleLoginSuccess, logout };

  return (
    <AuthContext.Provider value={authInfo}>{children}</AuthContext.Provider>
  );
};
