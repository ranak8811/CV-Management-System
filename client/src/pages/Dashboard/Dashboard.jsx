import useAuth from "../../hooks/useAuth";

const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="p-6 font-sans">
      <header className="flex items-center justify-center border-b border-gray-300 pb-4">
        <h2 className="text-xl font-bold text-gray-800">
          CV Management System Dashboard
        </h2>

        <div className="flex items-center">
          <span className="text-sm text-gray-650 mr-4">
            Welcome, <strong>{user?.name}</strong> ({user?.role})
          </span>

          <button
            onClick={logout}
            className="px-3 py-1 border border-gray-400 bg-gray-200 hover:bg-gray-350 rounded text-sm"
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
