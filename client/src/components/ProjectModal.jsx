import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../utils/api";
import Loading from "./Loading";

const ProjectModal = ({
  isOpen,
  onClose,
  onSave,
  projectToEdit,
  userVersion,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await api.get("/api/projects/tags");
        if (res.data.success) {
          setSuggestedTags(res.data.data);
        }
      } catch (err) {
        console.error("Fetch tags error:", err);
      }
    };
    if (isOpen) {
      fetchTags();
    }
  }, [isOpen]);

  useEffect(() => {
    if (projectToEdit) {
      setName(projectToEdit.name);
      setDescription(projectToEdit.description);
      setStartDate(
        projectToEdit.startDate ? projectToEdit.startDate.substring(0, 10) : "",
      );
      setEndDate(
        projectToEdit.endDate ? projectToEdit.endDate.substring(0, 10) : "",
      );
      setTags(projectToEdit.tags || []);
    } else {
      setName("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      setTags([]);
    }
    setTagInput("");
  }, [projectToEdit, isOpen]);

  if (!isOpen) return null;

  const handleAddTag = (tagVal) => {
    const trimmed = tagVal.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (indexToRemove) => {
    setTags(tags.filter((_, idx) => idx !== indexToRemove));
  };

  const filteredSuggestions = suggestedTags.filter(
    (st) =>
      st.toLowerCase().includes(tagInput.toLowerCase()) &&
      !tags.includes(st) &&
      tagInput.trim() !== "",
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedDesc = description.trim();

    if (!trimmedName || !trimmedDesc || !startDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    const payload = {
      name: trimmedName,
      description: trimmedDesc,
      startDate,
      endDate: endDate || null,
      tags,
      version: userVersion,
    };

    setSubmitting(true);
    try {
      if (projectToEdit) {
        const res = await api.put(`/api/projects/${projectToEdit.id}`, payload);
        if (res.data.success) {
          toast.success("Project updated successfully!");
          onSave(res.data.data, res.data.newVersion);
        }
      } else {
        const res = await api.post("/api/projects", payload);
        if (res.data.success) {
          toast.success("Project created successfully!");
          onSave(res.data.data, res.data.newVersion);
        }
      }
    } catch (error) {
      console.error("Save project error:", error);
      if (error.response?.status === 409) {
        toast.error("Conflict detected: Profile has changed. Please refresh.");
      } else {
        toast.error(error.response?.data?.message || "Failed to save project");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 text-base-content border border-base-300 p-6 rounded-lg w-full max-w-lg shadow-lg flex flex-col gap-4">
        <h3 className="text-lg font-bold">
          {projectToEdit ? "Edit Project Details" : "Add New Project"}
        </h3>

        {submitting ? (
          <div className="flex flex-col items-center justify-center p-8 gap-3">
            <Loading />
            <span className="font-semibold text-primary">
              Saving Project...
            </span>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 overflow-y-auto max-h-[75vh] pr-1"
          >
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold">Project Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input input-bordered w-full"
                placeholder="e.g. Portfolio Website"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold">Start Date *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input input-bordered w-full"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input input-bordered w-full"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold">
                Project Description (Markdown supported) *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="textarea textarea-bordered w-full h-28"
                placeholder="Describe project architecture, features..."
                required
              />
            </div>

            <div className="flex flex-col gap-1 relative">
              <label className="text-sm font-semibold">Technology Tags</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag(tagInput);
                    }
                  }}
                  className="input input-bordered flex-1"
                  placeholder="Type tag and press Enter"
                />
                <button
                  type="button"
                  onClick={() => handleAddTag(tagInput)}
                  className="btn btn-primary"
                >
                  Add
                </button>
              </div>

              {filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-base-200 border border-base-300 rounded shadow-md z-10 max-h-32 overflow-y-auto mt-1">
                  {filteredSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleAddTag(suggestion)}
                      className="w-full text-left px-3 py-1.5 hover:bg-base-300 text-sm"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="badge badge-neutral gap-2 p-3 rounded-full text-xs"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(index)}
                      className="text-red-500 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-neutral"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Project
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProjectModal;
