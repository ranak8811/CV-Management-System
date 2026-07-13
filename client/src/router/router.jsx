import { createBrowserRouter } from "react-router-dom";
import RootLayout from "../layouts/RootLayout";
import AuthLayout from "../layouts/AuthLayout";
import DashboardLayout from "../layouts/DashboardLayout";
import ErrorPage from "../components/ErrorPage";
import ProtectedRoute from "../routes/ProtectedRoute";
import Home from "../pages/Home/Home";
import Dashboard from "../pages/Dashboard/Dashboard";
import Login from "../pages/Authentication/Login";
import Register from "../pages/Authentication/Register";
import GitHubCallback from "../components/GitHubCallback";
import AttributesList from "../pages/Attributes/AttributesList";
import PositionsList from "../pages/Positions/PositionsList";
import PositionForm from "../pages/Positions/PositionForm";
import PositionDetail from "../pages/Positions/PositionDetail";
import Profile from "../pages/Profile/Profile";
import CVDetail from "../pages/CVs/CVDetail";
import UsersManagement from "../pages/Admin/UsersManagement";
import CVsList from "../pages/CVs/CVsList";

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
      {
        path: "positions",
        Component: PositionsList,
      },
      {
        path: "positions/:id",
        Component: PositionDetail,
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
        path: "register",
        Component: Register,
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
      {
        path: "profile",
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: "positions",
        element: (
          <ProtectedRoute>
            <PositionsList />
          </ProtectedRoute>
        ),
      },
      {
        path: "positions/new",
        element: (
          <ProtectedRoute>
            <PositionForm />
          </ProtectedRoute>
        ),
      },
      {
        path: "positions/edit/:id",
        element: (
          <ProtectedRoute>
            <PositionForm />
          </ProtectedRoute>
        ),
      },
      {
        path: "positions/:id",
        element: (
          <ProtectedRoute>
            <PositionDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: "cvs",
        element: (
          <ProtectedRoute>
            <CVsList />
          </ProtectedRoute>
        ),
      },
      {
        path: "cvs/:id",
        element: (
          <ProtectedRoute>
            <CVDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: "users",
        element: (
          <ProtectedRoute>
            <UsersManagement />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
