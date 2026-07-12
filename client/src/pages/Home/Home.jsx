import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import useAuth from "../../hooks/useAuth";
import Loading from "../../components/Loading";

const Home = () => {
  const { user } = useAuth();

  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLandingData = async () => {
      try {
        const res = await api.get("/api/public/landing");
        if (res.data.success) {
          setData(res.data.data);
        }
      } catch (error) {
        console.error("Fetch landing page data failed:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLandingData();
  }, []);

  const handleTagClick = (tag) => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (user.role === "RECRUITER" || user.role === "ADMIN") {
      navigate(`/dashboard/positions?search=${tag}`);
    } else {
      navigate(`/dashboard/positions?search=${tag}`);
    }
  };

  const handlePositionClick = (posId) => {
    if (!user) {
      navigate("/login");
    } else {
      navigate(`/dashboard/positions/${posId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-base-100 text-base-content p-6">
        <Loading />
        <span className="block mt-2 text-sm text-gray-500">
          Loading platform metrics...
        </span>
      </div>
    );
  }

  const stats = data?.statistics || {
    totalPositions: 0,
    totalCandidates: 0,
    totalRecruiters: 0,
    totalSubmittedCVs: 0,
    cvsLast24Hours: 0,
  };

  return (
    <div className="min-h-screen bg-base-100 text-base-content font-sans flex flex-col">
      <main className="flex-1 max-w-5xl mx-auto w-full p-6 flex flex-col gap-10 my-4">
        <div className="text-center py-6 flex flex-col gap-3">
          <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            Customizable CV Generation Platform
          </h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Recruiters build position templates with specific attributes, and
            candidates generate tailored resumes with real-time verification.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="border border-base-300 p-4 rounded-lg bg-base-200 text-center">
            <span className="text-2xl font-bold text-primary block">
              {stats.totalPositions}
            </span>
            <span className="text-xs text-gray-500 font-semibold uppercase">
              Positions
            </span>
          </div>
          <div className="border border-base-300 p-4 rounded-lg bg-base-200 text-center">
            <span className="text-2xl font-bold text-primary block">
              {stats.totalCandidates}
            </span>
            <span className="text-xs text-gray-500 font-semibold uppercase">
              Candidates
            </span>
          </div>
          <div className="border border-base-300 p-4 rounded-lg bg-base-200 text-center">
            <span className="text-2xl font-bold text-primary block">
              {stats.totalRecruiters}
            </span>
            <span className="text-xs text-gray-500 font-semibold uppercase">
              Recruiters
            </span>
          </div>
          <div className="border border-base-300 p-4 rounded-lg bg-base-200 text-center">
            <span className="text-2xl font-bold text-primary block">
              {stats.totalSubmittedCVs}
            </span>
            <span className="text-xs text-gray-500 font-semibold uppercase">
              Submitted CVs
            </span>
          </div>
          <div className="border border-base-300 p-4 rounded-lg bg-base-200 text-center col-span-2 md:col-span-1">
            <span className="text-2xl font-bold text-accent block">
              {stats.cvsLast24Hours}
            </span>
            <span className="text-xs text-gray-500 font-semibold uppercase">
              New (24h)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-base-300 p-6 rounded-lg bg-base-200 flex flex-col gap-4">
            <h3 className="text-lg font-bold border-b border-base-300 pb-2 text-primary">
              Latest Positions
            </h3>
            {data?.latestPositions?.length === 0 ? (
              <p className="text-sm text-gray-500">No positions listed.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table w-full bg-base-100 text-xs">
                  <thead>
                    <tr className="bg-base-300">
                      <th>Title</th>
                      <th>CVs Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.latestPositions.map((pos) => (
                      <tr key={pos.id} className="hover:bg-base-200">
                        <td
                          onClick={() => handlePositionClick(pos.id)}
                          className="font-bold text-primary hover:underline cursor-pointer"
                        >
                          {pos.title}
                        </td>
                        <td>{pos._count?.cvs || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="border border-base-300 p-6 rounded-lg bg-base-200 flex flex-col gap-4">
            <h3 className="text-lg font-bold border-b border-base-300 pb-2 text-primary">
              Most Popular Positions
            </h3>
            {data?.popularPositions?.length === 0 ? (
              <p className="text-sm text-gray-500">
                No popular positions found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table w-full bg-base-100 text-xs">
                  <thead>
                    <tr className="bg-base-300">
                      <th>Title</th>
                      <th>CVs Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.popularPositions.map((pos) => (
                      <tr key={pos.id} className="hover:bg-base-200">
                        <td
                          onClick={() => handlePositionClick(pos.id)}
                          className="font-bold text-primary hover:underline cursor-pointer"
                        >
                          {pos.title}
                        </td>
                        <td>{pos._count?.cvs || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="border border-base-300 p-6 rounded-lg bg-base-200 flex flex-col gap-3">
          <h3 className="text-lg font-bold border-b border-base-300 pb-2 text-primary">
            Technology Tag Cloud
          </h3>
          {data?.tags?.length === 0 ? (
            <p className="text-sm text-gray-500">No tags aggregated yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2 pt-2">
              {data.tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className="btn btn-outline btn-sm hover:btn-primary"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="bg-base-200 border-t border-base-300 p-6 text-center text-xs text-gray-500 mt-10">
        © {new Date().getFullYear()} CV Management System. All rights reserved.
      </footer>
    </div>
  );
};

export default Home;
