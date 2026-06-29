import { createBrowserRouter } from "react-router-dom";
import RootLayout from "../layouts/RootLayout";
import AuthLayout from "../layouts/AuthLayout";
import DashboardLayout from "../layouts/DashboardLayout";
import ErrorPage from "../components/ErrorPage";
import ProtectedRoute from "../routes/ProtectedRoute";
import Home from "../pages/Home/Home";
import Dashboard from "../pages/Dashboard/Dashboard";
import Login from "../pages/Login";
import GitHubCallback from "../components/GitHubCallback";
import AttributesList from "../pages/Attributes/AttributesList";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        Component: Home,
      },
    ],
  },
  {
    path: "/",
    Component: AuthLayout,
    children: [
      {
        path: "login",
        Component: Login,
      },
      {
        path: "auth/github/callback",
        Component: GitHubCallback,
      },
    ],
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        Component: Dashboard,
      },

      {
        path: "attributes",
        element: (
          <ProtectedRoute>
            <AttributesList />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
