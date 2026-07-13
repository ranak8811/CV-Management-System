import useAuth from "../hooks/useAuth";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-4 text-center">Loading User Profile...</div>;
  }

  if (!user) {
    return <Navigate to={"/login"} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={"/dashboard"} replace />;
  }

  return children;
};

export default ProtectedRoute;
