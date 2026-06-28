import { useNavigate } from "react-router-dom";

const ErrorPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-center p-4">
      <h1 className="text-4xl font-bold text-red-650 mb-2">404</h1>
      <p className="text-gray-700 mb-4">
        Something went wrong or page not found.
      </p>
      <button
        onClick={() => navigate("/")}
        className="px-4 py-2 bg-gray-800 text-white rounded font-bold text-sm"
      >
        Go Home
      </button>
    </div>
  );
};

export default ErrorPage;
