import { useEffect, useState } from "react";
import api from "../utils/api";
import toast from "react-hot-toast";
import Loading from "./Loading";

const CreateCVModal = ({ isOpen, onClose, onSave }) => {
  const [positions, setPositions] = useState([]);
  const [selectedPositionId, setSelectedPositionId] = useState("");
  const [cvName, setCvName] = useState("");
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadPositions = async () => {
      setLoadingPositions(true);
      try {
        const res = await api.get("/api/positions");
        if (res.data.success) {
          setPositions(res.data.data);
        }
      } catch (err) {
        console.error("Load positions error:", err);
        toast.error("Failed to load available positions");
      } finally {
        setLoadingPositions(false);
      }
    };
    if (isOpen) {
      loadPositions();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setCvName("");
    setSelectedPositionId("");
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedPositionId) {
      toast.error("Please select a position template");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/api/cvs", {
        positionId: selectedPositionId,
        name: cvName.trim() || undefined,
      });

      if (res.data.success) {
        toast.success("CV generated successfully!");
        handleClose();
        onSave(res.data.data.id);
      }
    } catch (error) {
      console.error("Create CV error:", error);
      if (error.response?.status === 403) {
        toast.error(
          "Access Denied: You do not satisfy the access filters for this position",
        );
      } else {
        toast.error(error.response?.data?.message || "Failed to create CV");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 text-base-content border border-base-300 p-6 rounded-lg w-full max-w-md shadow-lg flex flex-col gap-4">
        <h3 className="text-lg font-bold">Create New Tailored CV</h3>

        {submitting ? (
          <div className="flex flex-col items-center justify-center p-8 gap-3">
            <Loading />
            <span className="font-semibold text-primary">Generating CV...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold">
                Select Position Template *
              </label>
              {loadingPositions ? (
                <div className="text-sm text-gray-500 py-2">
                  Loading positions...
                </div>
              ) : (
                <select
                  value={selectedPositionId}
                  onChange={(e) => setSelectedPositionId(e.target.value)}
                  className="select select-bordered w-full"
                  required
                >
                  <option value="">-- Choose Position --</option>
                  {positions.map((pos) => (
                    <option key={pos.id} value={pos.id}>
                      {pos.title} {pos.isPublic ? "" : "(Restricted)"}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold">
                CV Custom Name (Optional)
              </label>
              <input
                type="text"
                value={cvName}
                onChange={(e) => setCvName(e.target.value)}
                className="input input-bordered w-full"
                placeholder="e.g. My BA Resume"
              />
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={handleClose}
                className="btn btn-neutral"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loadingPositions}
                className="btn btn-primary"
              >
                Create CV
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateCVModal;
