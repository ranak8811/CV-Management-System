import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import api from "../../utils/api";

const PositionsList = () => {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const fetchPositions = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/positions?search=${search}`);
        if (active && res.data.success) {
          setPositions(res.data.data);
          setSelectedIds([]);
        }
      } catch (error) {
        console.error("Fetch positions error:", error);
        toast.error("Failed to load positions");
      }
      if (active) setLoading(false);
    };

    fetchPositions();

    return () => {
      active = false;
    };
  }, [search, refreshTrigger]);

  const handleSelectRow = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(positions.map((pos) => pos.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;

    const result = await Swal.fire({
      title: "Are you sure?",
      text: `You are about to delete ${selectedIds.length} position(s). This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, delete!",
    });

    if (!result.isConfirmed) return;

    try {
      for (const id of selectedIds) {
        await api.delete(`/api/positions/${id}`);
      }
      toast.success("Selected position(s) deleted successfully!");
      setSelectedIds([]);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Delete position error:", error);
      toast.error("Some positions could not be deleted");
    }
  };

  const handleDuplicateSelected = async () => {
    if (selectedIds.length !== 1) return;
    const targetId = selectedIds[0];

    try {
      const res = await api.post(`/api/positions/${targetId}/duplicate`);
      if (res.data.success) {
        toast.success("Position duplicated successfully!");
        setSelectedIds([]);
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Duplicate error:", error);
      toast.error("Failed to duplicate position");
    }
  };

  const handleAddNewClick = () => {
    navigate("/dashboard/positions/new");
  };

  const handleEditClick = () => {
    if (selectedIds.length !== 1) return;
    navigate(`/dashboard/positions/edit/${selectedIds[0]}`);
  };

  return (
    <div className="p-4 font-sans bg-base-100 text-base-content min-h-screen">
      <h2 className="text-2xl font-bold mb-6">Positions Management</h2>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search positions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input input-bordered w-full md:w-64"
        />
      </div>

      <div className="flex items-center gap-3 p-3 bg-base-200 border border-base-300 rounded-md mb-4 justify-between">
        <div className="text-sm font-semibold">
          Selected: <span className="text-primary">{selectedIds.length}</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleAddNewClick}
            className="btn btn-sm btn-primary"
          >
            + Add New
          </button>

          <button
            onClick={handleDuplicateSelected}
            disabled={selectedIds.length !== 1}
            className="btn btn-sm btn-neutral"
          >
            Duplicate
          </button>

          <button
            onClick={handleEditClick}
            disabled={selectedIds.length !== 1}
            className="btn btn-sm btn-neutral"
          >
            Edit
          </button>

          <button
            onClick={handleDeleteSelected}
            disabled={selectedIds.length === 0}
            className="btn btn-sm btn-error"
          >
            Delete
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-8">Loading Positions...</div>
      ) : positions.length === 0 ? (
        <div className="text-center p-8 text-gray-500">No positions found.</div>
      ) : (
        <div className="overflow-x-auto border border-base-300 rounded-md">
          <table className="table w-full">
            <thead>
              <tr className="bg-base-200">
                <th className="w-12 text-center">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.length === positions.length &&
                      positions.length > 0
                    }
                    onChange={handleSelectAll}
                    className="checkbox checkbox-sm"
                  />
                </th>
                <th>Title</th>
                <th>Description</th>
                <th>Visibility</th>
                <th>Attributes Included</th>
                <th>Submitted CVs</th>
                <th>Join Discussion</th>
              </tr>
            </thead>

            <tbody>
              {positions.map((pos) => (
                <tr key={pos.id} className="hover:bg-base-200">
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(pos.id)}
                      onChange={() => handleSelectRow(pos.id)}
                      className="checkbox checkbox-sm"
                    />
                  </td>

                  <td className="font-bold">{pos.title}</td>
                  <td className="max-w-xs truncate">{pos.description}</td>
                  <td>
                    <span
                      className={`badge ${pos.isPublic ? "badge-success" : "badge-warning"} badge-sm`}
                    >
                      {pos.isPublic ? "Public" : "Restricted"}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-outline">
                      {pos.positionAttributes?.length || 0}
                    </span>
                  </td>
                  <td>
                    <span className="font-semibold text-primary">
                      {pos._count?.cvs || 0}
                    </span>
                  </td>
                  <td
                    onClick={() => navigate(`/dashboard/positions/${pos.id}`)}
                    className="font-bold text-primary hover:underline cursor-pointer"
                  >
                    {pos.title}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PositionsList;
