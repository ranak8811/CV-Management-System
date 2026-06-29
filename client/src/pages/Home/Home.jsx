import { Link } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-base-100 text-base-content p-6">
      <div className="max-w-md text-center border border-base-300 p-8 rounded-lg bg-base-200">
        <h1 className="text-3xl font-bold mb-4">CV Management System</h1>
        <p className="text-gray-500 mb-6">
          Build, manage, and share your professional CVs easily.
        </p>

        {user ? (
          <Link
            to="/dashboard"
            className="px-6 py-2 bg-primary text-primary-content rounded-md font-bold hover:opacity-90 inline-block"
          >
            Go to Dashboard
          </Link>
        ) : (
          <Link
            to="/login"
            className="px-6 py-2 bg-gray-800 text-white rounded-md font-bold hover:bg-gray-700 inline-block"
          >
            Get Started (Sign In)
          </Link>
        )}
      </div>
    </div>
  );
};

export default Home;
