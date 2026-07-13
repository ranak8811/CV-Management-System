import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../utils/api";
import toast from "react-hot-toast";
import Loading from "../../components/Loading";

const CVsList = () => {
  const location = useLocation();
  return <CVsListInner key={location.search} />;
};

const CVsListInner = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const getQueryParam = () => {
    const params = new URLSearchParams(location.search);
    return params.get("search") || "";
  };

  const [search, setSearch] = useState(() => getQueryParam());
  const [category, setCategory] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  const { data: cvs = [], isLoading } = useQuery({
    queryKey: ["admin-cvs-list", { search, category }],
    queryFn: async () => {
      const res = await api.get(
        `/api/cvs?search=${search}&category=${category}`
      );
      return res.data.success ? res.data.data : [];
    },
  });

  const { data: libraryAttributes = [] } = useQuery({
    queryKey: ["attributes"],
    queryFn: async () => {
      const res = await api.get("/api/attributes");
      return res.data.success ? res.data.data : [];
    },
  });

  const categories = Array.from(
    new Set(libraryAttributes.map((a) => a.category))
  );

  const likeMutation = useMutation({
    mutationFn: async (cvId) => {
      const res = await api.post(`/api/cvs/${cvId}/like`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-cvs-list"] });
      toast.success(data.message || "CV Like toggled successfully");
      setSelectedIds([]);
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to toggle like");
    },
  });

  const handleSelectRow = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(cvs.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleOpenCV = () => {
    if (selectedIds.length !== 1) return;
    navigate(`/dashboard/cvs/${selectedIds[0]}`);
  };

  const handleLikeToggle = () => {
    if (selectedIds.length !== 1) return;
    likeMutation.mutate(selectedIds[0]);
  };

  return (
    <div className="p-4 font-sans bg-base-100 text-base-content min-h-screen">
      <h2 className="text-2xl font-bold mb-6">
        Submitted Candidate Resumes (CVs)
      </h2>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by candidate name, CV title, or attribute value..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedIds([]);
          }}
          className="input input-bordered w-full md:w-96"
        />

        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setSelectedIds([]);
          }}
          className="select select-bordered w-full md:w-64"
        >
          <option value="">-- All Custom Categories --</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3 p-3 bg-base-200 border border-base-300 rounded-md mb-4 justify-between">
        <div className="text-sm font-semibold">
          Selected: <span className="text-primary">{selectedIds.length}</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleOpenCV}
            disabled={selectedIds.length !== 1}
            className="btn btn-sm btn-primary"
          >
            Open CV Details
          </button>

          <button
            onClick={handleLikeToggle}
            disabled={selectedIds.length !== 1 || likeMutation.isPending}
            className="btn btn-sm btn-neutral"
          >
            Like / Unlike
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center p-8">
          <Loading />
          <span className="block mt-2">Loading CV database...</span>
        </div>
      ) : cvs.length === 0 ? (
        <div className="text-center p-8 text-gray-500">
          No matching candidate CVs found.
        </div>
      ) : (
        <div className="overflow-x-auto border border-base-300 rounded-md">
          <table className="table w-full bg-base-100 text-sm">
            <thead>
              <tr className="bg-base-200">
                <th className="w-12 text-center">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.length === cvs.length && cvs.length > 0
                    }
                    onChange={handleSelectAll}
                    className="checkbox checkbox-sm"
                  />
                </th>
                <th>Candidate Name</th>
                <th>CV Profile Name</th>
                <th>Applied Position</th>
                <th>Likes Count</th>
                <th>Submitted On</th>
              </tr>
            </thead>
            <tbody>
              {cvs.map((c) => (
                <tr key={c.id} className="hover:bg-base-200">
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(c.id)}
                      onChange={() => handleSelectRow(c.id)}
                      className="checkbox checkbox-sm"
                    />
                  </td>
                  <td className="font-bold">{c.candidate.name}</td>
                  <td
                    onClick={() => navigate(`/dashboard/cvs/${c.id}`)}
                    className="text-primary font-bold hover:underline cursor-pointer"
                  >
                    {c.name}
                  </td>
                  <td>{c.position?.title}</td>
                  <td>
                    <span className="badge badge-accent text-white">
                      {c._count?.likes || 0} Likes
                    </span>
                  </td>
                  <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CVsList;
