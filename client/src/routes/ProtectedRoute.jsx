import useAuth from "../hooks/useAuth";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-4 text-center">Loading User Profile...</div>;
  }

  if (!user) {
    return <Navigate to={"/login"} replace />;
  }

  return children;
};

export default ProtectedRoute;
