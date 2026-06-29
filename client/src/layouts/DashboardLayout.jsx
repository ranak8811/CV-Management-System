import { Outlet } from "react-router-dom";

const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-base-100 text-base-content font-sans">
      <div className="flex flex-col md:flex-row min-h-screen">
        <aside className="w-full md:w-64 bg-base-200 border-r border-base-300 p-4">
          <h2 className="text-xl font-bold mb-6 text-primary">CV System</h2>
          <nav className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Navigation
            </span>
            <div className="p-2 bg-primary text-primary-content rounded font-semibold cursor-pointer">
              Dashboard
            </div>
          </nav>
        </aside>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
