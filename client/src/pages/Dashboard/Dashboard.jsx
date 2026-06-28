import useAuth from "../../hooks/useAuth";
import toast from "react-hot-toast";

const Dashboard = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    toast.success("Successfully logged out!");
  };

  return (
    <div className="p-6 font-sans">
      <header className="flex justify-between items-center border-b border-gray-300 pb-4">
        <h2 className="text-xl font-bold text-gray-800">
          CV Management System Dashboard
        </h2>
        <div className="flex items-center">
          <span className="text-sm text-gray-650 mr-4">
            Welcome, <strong>{user?.name}</strong> ({user?.role})
          </span>
          <button
            onClick={handleLogout}
            className="px-3 py-1 border border-gray-400 bg-gray-200 hover:bg-gray-300 rounded text-sm"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="mt-6">
        <h3 className="text-lg font-bold mb-2">Congratulations!</h3>
        <p className="text-gray-750">
          You have successfully logged in via social authentication.
        </p>
        <p className="text-gray-750 mt-2">Your Email: {user?.email}</p>
      </main>
    </div>
  );
};

export default Dashboard;
