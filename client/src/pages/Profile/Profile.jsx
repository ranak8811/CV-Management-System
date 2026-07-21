import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../utils/api";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import Loading from "../../components/Loading";
import ProjectModal from "../../components/ProjectModal";
import CreateCVModal from "../../components/CreateCVModal";
import { marked } from "marked";
import useTitle from "../../hooks/useTitle";

const Profile = () => {
  useTitle("My Profile");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState(null);

  const [isCVModalOpen, setIsCVModalOpen] = useState(false);
  const [selectedCVIds, setSelectedCVIds] = useState([]);

  const [attrSearch, setAttrSearch] = useState("");
  const [attrCategory, setAttrCategory] = useState("");
  const [recentlyUsedIds, setRecentlyUsedIds] = useState(() =>
    JSON.parse(localStorage.getItem("recently_used_attrs") || "[]"),
  );

  const { data: profileData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await api.get("/api/profile");
      return res.data.success ? res.data.data : null;
    },
  });

  const profileUser = profileData?.user;
  const attributes = profileData?.attributes || [];
  const projects = profileData?.projects || [];

  const { data: libraryAttributes = [] } = useQuery({
    queryKey: ["attributes"],
    queryFn: async () => {
      const res = await api.get("/api/attributes");
      return res.data.success ? res.data.data : [];
    },
  });

  const { data: cvs = [], isLoading: isLoadingCVs } = useQuery({
    queryKey: ["my-cvs"],
    queryFn: async () => {
      const res = await api.get("/api/cvs/my");
      return res.data.success ? res.data.data : [];
    },
  });

  useEffect(() => {
    if (Object.keys(unsavedChanges).length === 0) return;

    const autoSaveTimer = setTimeout(async () => {
      setSaving(true);
      try {
        let currentVersion = profileUser.version;
        for (const [attrId, val] of Object.entries(unsavedChanges)) {
          const res = await api.post("/api/profile/attribute", {
            attributeId: attrId,
            value: val,
            version: currentVersion,
          });
          if (res.data.success) {
            currentVersion = res.data.newVersion;
          }
        }
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        setUnsavedChanges({});
        toast.success("Profile changes auto-saved!");
      } catch (err) {
        console.error("Auto save failed:", err);
        if (err.response?.status === 409) {
          toast.error(
            "Version conflict: Profile updated elsewhere. Please refresh.",
          );
        } else {
          toast.error("Failed to auto-save profile details");
        }
      } finally {
        setSaving(false);
      }
    }, 5000);

    return () => clearTimeout(autoSaveTimer);
  }, [unsavedChanges, profileUser?.version, queryClient]);

  const uploadImageObj = async (image) => {
    const apiKey = import.meta.env.VITE_imgbb_key;
    const formData = new FormData();
    formData.append("image", image);
    const response = await fetch(
      `https://api.imgbb.com/1/upload?key=${apiKey}`,
      {
        method: "POST",
        body: formData,
      },
    );
    const result = await response.json();
    return result.success ? result.data.url : null;
  };

  const handleImageFileChange = async (e, attrId) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const imageUrl = await uploadImageObj(file);
      if (imageUrl) {
        const res = await api.post("/api/profile/attribute", {
          attributeId: attrId,
          value: imageUrl,
          version: profileUser.version,
        });
        if (res.data.success) {
          queryClient.invalidateQueries({ queryKey: ["profile"] });
          toast.success("Photo uploaded successfully!");
        }
      } else {
        toast.error("Failed to upload image to host");
      }
    } catch (err) {
      console.error(err);
      toast.error("Photo upload error");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleInputChange = (attrId, val) => {
    setUnsavedChanges((prev) => ({
      ...prev,
      [attrId]: val,
    }));
  };

  const trackRecentlyUsed = (id) => {
    const updated = [id, ...recentlyUsedIds.filter((x) => x !== id)].slice(
      0,
      5,
    );
    setRecentlyUsedIds(updated);
    localStorage.setItem("recently_used_attrs", JSON.stringify(updated));
  };

  const handleAddAttribute = async (attrId) => {
    try {
      const res = await api.post("/api/profile/attribute", {
        attributeId: attrId,
        value: "",
        version: profileUser.version,
      });

      if (res.data.success) {
        trackRecentlyUsed(attrId);
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        toast.success("Attribute added to profile!");
        setIsAddModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 409) {
        toast.error("Version conflict. Please refresh page.");
      } else {
        toast.error(err.response?.data?.message || "Failed to add attribute");
      }
    }
  };

  const handleRemoveAttribute = async (attrId) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Do you want to remove this attribute from your profile?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, remove!",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await api.post("/api/profile/attribute/remove", {
        attributeId: attrId,
        version: profileUser.version,
      });

      if (res.data.success) {
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        toast.success("Attribute removed from profile");
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 409) {
        toast.error("Version conflict. Please refresh page.");
      } else {
        toast.error("Failed to remove attribute");
      }
    }
  };

  const handleProjectSave = () => {
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    setIsProjectModalOpen(false);
  };

  const handleDeleteProject = async (projId) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Do you want to delete this project from your profile?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, delete!",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await api.delete(`/api/projects/${projId}`, {
        data: { version: profileUser.version },
      });

      if (res.data.success) {
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        toast.success("Project deleted successfully");
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 409) {
        toast.error("Version conflict. Please refresh page.");
      } else {
        toast.error("Failed to delete project");
      }
    }
  };

  const handleCVGenerated = () => {
    queryClient.invalidateQueries({ queryKey: ["my-cvs"] });
    setIsCVModalOpen(false);
  };

  const handleSelectCVRow = (cvId) => {
    if (selectedCVIds.includes(cvId)) {
      setSelectedCVIds(selectedCVIds.filter((id) => id !== cvId));
    } else {
      setSelectedCVIds([...selectedCVIds, cvId]);
    }
  };

  const handleSelectAllCVs = (e) => {
    if (e.target.checked) {
      setSelectedCVIds(visibleCVs.map((cv) => cv.id));
    } else {
      setSelectedCVIds([]);
    }
  };

  const handleOpenSelectedCV = () => {
    if (selectedCVIds.length !== 1) return;
    navigate(`/dashboard/cvs/${selectedCVIds[0]}`);
  };

  const handleDeleteSelectedCVs = async () => {
    if (selectedCVIds.length === 0) return;

    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Delete selected CV profiles?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, delete!",
    });

    if (!result.isConfirmed) return;

    try {
      for (const cvId of selectedCVIds) {
        const matched = cvs.find((c) => c.id === cvId);
        await api.delete(`/api/cvs/${cvId}`, {
          data: { version: matched.version },
        });
      }
      queryClient.invalidateQueries({ queryKey: ["my-cvs"] });
      toast.success("Selected CVs deleted successfully");
      setSelectedCVIds([]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete some CVs");
    }
  };

  const checkCandidateAccess = (pos, candidateAttrs) => {
    if (!pos) return true;
    if (pos.isPublic) return true;
    if (!pos.accessRules || pos.accessRules.length === 0) return true;

    return pos.accessRules.every((rule) => {
      const matched = candidateAttrs.find(
        (ca) => ca.attributeId === rule.attributeId,
      );
      const candidateVal = matched ? String(matched.value) : "";

      switch (rule.operator) {
        case "EQUALS":
          return candidateVal.toLowerCase() === rule.value.toLowerCase();
        case "GREATER_THAN":
          return Number(candidateVal) > Number(rule.value);
        case "LESS_THAN":
          return Number(candidateVal) < Number(rule.value);
        case "CONTAINS":
          return candidateVal.toLowerCase().includes(rule.value.toLowerCase());
        case "IS_CHECKED":
          return candidateVal === "true";
        default:
          return true;
      }
    });
  };

  if (isLoadingProfile || isLoadingCVs) {
    return (
      <div className="text-center p-8">
        <Loading />
        <span className="block mt-2">Loading profile details...</span>
      </div>
    );
  }

  const meAttrs = attributes.filter((a) =>
    ["First Name", "Last Name", "Location", "Personal Photo"].includes(
      a.attribute.name,
    ),
  );

  const infoAttrs = attributes.filter(
    (a) =>
      !["First Name", "Last Name", "Location", "Personal Photo"].includes(
        a.attribute.name,
      ),
  );

  const availableLibraryAttrs = libraryAttributes.filter(
    (la) =>
      !attributes.some((a) => a.attributeId === la.id) &&
      !["First Name", "Last Name", "Location", "Personal Photo"].includes(
        la.name,
      ),
  );

  const filteredLibraryAttrs = availableLibraryAttrs.filter((la) => {
    const matchesSearch = la.name
      .toLowerCase()
      .startsWith(attrSearch.toLowerCase());
    const matchesCategory = !attrCategory || la.category === attrCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(
    new Set(availableLibraryAttrs.map((a) => a.category)),
  );

  const visibleCVs = cvs.filter((cv) =>
    checkCandidateAccess(cv.position, attributes),
  );

  const renderInputField = (attr) => {
    const { type, name, options } = attr.attribute;
    const value =
      unsavedChanges[attr.attributeId] !== undefined
        ? unsavedChanges[attr.attributeId]
        : attr.value;

    switch (type) {
      case "BOOLEAN":
        return (
          <input
            type="checkbox"
            checked={value === "true"}
            onChange={(e) =>
              handleInputChange(attr.attributeId, String(e.target.checked))
            }
            className="checkbox checkbox-md"
          />
        );
      case "DROPDOWN":
        return (
          <select
            value={value}
            onChange={(e) =>
              handleInputChange(attr.attributeId, e.target.value)
            }
            className="select select-bordered w-full"
          >
            <option value="">-- Select {name} --</option>
            {options.map((opt) => (
              <option key={opt.id} value={opt.value}>
                {opt.value}
              </option>
            ))}
          </select>
        );
      case "NUMERIC":
        return (
          <input
            type="number"
            value={value}
            onChange={(e) =>
              handleInputChange(attr.attributeId, e.target.value)
            }
            className="input input-bordered w-full"
            placeholder={`Enter ${name}`}
          />
        );
      case "DATE":
        return (
          <input
            type="date"
            value={value}
            onChange={(e) =>
              handleInputChange(attr.attributeId, e.target.value)
            }
            className="input input-bordered w-full"
          />
        );
      case "PERIOD": {
        const [start, end] = value.split(" to ");
        return (
          <div className="flex gap-2 w-full">
            <input
              type="date"
              value={start || ""}
              onChange={(e) =>
                handleInputChange(
                  attr.attributeId,
                  `${e.target.value} to ${end || ""}`,
                )
              }
              className="input input-bordered flex-1"
            />
            <span className="self-center">to</span>
            <input
              type="date"
              value={end || ""}
              onChange={(e) =>
                handleInputChange(
                  attr.attributeId,
                  `${start || ""} to ${e.target.value}`,
                )
              }
              className="input input-bordered flex-1"
            />
          </div>
        );
      }
      case "TEXT":
        return (
          <textarea
            value={value}
            onChange={(e) =>
              handleInputChange(attr.attributeId, e.target.value)
            }
            className="textarea textarea-bordered w-full h-24"
            placeholder={`Markdown description for ${name}`}
          />
        );
      case "IMAGE":
        return (
          <div className="flex flex-col gap-2 w-full">
            {value && (
              <img
                src={value}
                alt={name}
                className="w-32 h-32 object-cover border border-base-300 rounded"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageFileChange(e, attr.attributeId)}
              className="file-input file-input-bordered file-input-md w-full"
              disabled={uploadingImage}
            />
          </div>
        );
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) =>
              handleInputChange(attr.attributeId, e.target.value)
            }
            className="input input-bordered w-full"
            placeholder={`Enter ${name}`}
          />
        );
    }
  };

  const renderMarkdown = (text) => {
    return { __html: marked.parse(text || "") };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="p-4 font-sans bg-base-100 text-base-content min-h-screen max-w-4xl mx-auto flex flex-col gap-8">
      <div className="flex justify-between items-center border-b border-base-300 pb-4">
        <div>
          <h2 className="text-2xl font-bold">My Personal Profile</h2>
          <p className="text-sm text-gray-500 mt-1">
            Keep your profile details and attribute records up to date.
          </p>
        </div>
        {saving && (
          <span className="badge badge-primary py-3">
            Auto-saving changes...
          </span>
        )}
      </div>

      <div className="border border-base-300 p-6 rounded-lg bg-base-200 flex flex-col gap-4">
        <h3 className="text-lg font-bold border-b border-base-300 pb-2 text-primary">
          Me (Personal Info)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {meAttrs.map((attr) => (
            <div
              key={attr.id}
              className="flex flex-col gap-1.5 bg-base-100 p-3 rounded border border-base-300"
            >
              <label className="text-xs font-bold text-gray-500 uppercase">
                {attr.attribute.name}
              </label>
              {renderInputField(attr)}
            </div>
          ))}
        </div>
      </div>

      <div className="border border-base-300 p-6 rounded-lg bg-base-200 flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-base-300 pb-2">
          <h3 className="text-lg font-bold text-primary">
            Custom Profile Attributes
          </h3>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-sm btn-primary"
          >
            + Add Attribute
          </button>
        </div>

        {infoAttrs.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No custom attributes added yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {infoAttrs.map((attr) => (
              <div
                key={attr.id}
                className="bg-base-100 p-4 rounded border border-base-300 flex flex-col gap-3 relative"
              >
                <button
                  onClick={() => handleRemoveAttribute(attr.attributeId)}
                  className="absolute top-2 right-2 text-red-500 font-bold hover:underline text-xs"
                >
                  Remove
                </button>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400 font-semibold">
                    {attr.attribute.category}
                  </span>
                  <span className="font-bold text-sm">
                    {attr.attribute.name}
                  </span>
                </div>
                {renderInputField(attr)}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border border-base-300 p-6 rounded-lg bg-base-200 flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-base-300 pb-2">
          <h3 className="text-lg font-bold text-primary">
            Projects & Experience
          </h3>
          <button
            onClick={() => {
              setProjectToEdit(null);
              setIsProjectModalOpen(true);
            }}
            className="btn btn-sm btn-primary"
          >
            + Add Project
          </button>
        </div>

        {projects.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No projects recorded yet.
          </p>
        ) : (
          projects.map((proj) => (
            <div
              key={proj.id}
              className="bg-base-100 p-4 rounded border border-base-300 flex flex-col gap-2 relative"
            >
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  onClick={() => {
                    setProjectToEdit(proj);
                    setIsProjectModalOpen(true);
                  }}
                  className="text-primary font-bold hover:underline text-xs"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteProject(proj.id)}
                  className="text-red-500 font-bold hover:underline text-xs"
                >
                  Delete
                </button>
              </div>

              <div>
                <h4 className="font-bold text-base pr-20">{proj.name}</h4>
                <span className="text-xs text-gray-400">
                  {formatDate(proj.startDate)} -{" "}
                  {proj.endDate ? formatDate(proj.endDate) : "Present"}
                </span>
              </div>

              <div
                dangerouslySetInnerHTML={renderMarkdown(proj.description)}
                className="text-sm prose prose-sm max-w-none text-base-content"
              />

              {proj.tags && proj.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {proj.tags.map((tag, idx) => (
                    <span key={idx} className="badge badge-outline badge-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="border border-base-300 p-6 rounded-lg bg-base-200 flex flex-col gap-4">
        <h3 className="text-lg font-bold border-b border-base-300 pb-2 text-primary">
          CVs (Generated CV Profiles)
        </h3>

        <div className="flex items-center gap-3 p-3 bg-base-100 border border-base-300 rounded-md mb-2 justify-between">
          <div className="text-sm font-semibold">
            Selected:{" "}
            <span className="text-primary">{selectedCVIds.length}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsCVModalOpen(true)}
              className="btn btn-sm btn-primary"
            >
              + Create CV
            </button>
            <button
              onClick={handleOpenSelectedCV}
              disabled={selectedCVIds.length !== 1}
              className="btn btn-sm btn-neutral"
            >
              Open
            </button>
            <button
              onClick={handleDeleteSelectedCVs}
              disabled={selectedCVIds.length === 0}
              className="btn btn-sm btn-error"
            >
              Delete
            </button>
          </div>
        </div>

        {visibleCVs.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No CV profiles generated yet (or access rules lost).
          </p>
        ) : (
          <div className="overflow-x-auto border border-base-300 rounded-md">
            <table className="table w-full bg-base-100">
              <thead>
                <tr className="bg-base-300 text-sm">
                  <th className="w-12 text-center">
                    <input
                      type="checkbox"
                      checked={
                        selectedCVIds.length === visibleCVs.length &&
                        visibleCVs.length > 0
                      }
                      onChange={handleSelectAllCVs}
                      className="checkbox checkbox-sm"
                    />
                  </th>
                  <th>CV Profile Name</th>
                  <th>Applied Position</th>
                  <th>Status</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {visibleCVs.map((cv) => (
                  <tr key={cv.id} className="hover:bg-base-200 text-sm">
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={selectedCVIds.includes(cv.id)}
                        onChange={() => handleSelectCVRow(cv.id)}
                        className="checkbox checkbox-sm"
                      />
                    </td>
                    <td
                      className="font-bold text-primary hover:underline cursor-pointer"
                      onClick={() => navigate(`/dashboard/cvs/${cv.id}`)}
                    >
                      {cv.name}
                    </td>
                    <td>{cv.position?.title}</td>
                    <td>
                      <span
                        className={`badge ${
                          cv.isPublished ? "badge-success" : "badge-warning"
                        } badge-sm`}
                      >
                        {cv.isPublished
                          ? "Active / Published"
                          : "Inactive / Draft"}
                      </span>
                    </td>
                    <td>{formatDate(cv.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-base-100 text-base-content border border-base-300 p-6 rounded-lg w-full max-w-md shadow-lg flex flex-col gap-4">
            <h3 className="text-lg font-bold">Add Custom Attribute</h3>

            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Search attributes by prefix..."
                value={attrSearch}
                onChange={(e) => setAttrSearch(e.target.value)}
                className="input input-bordered w-full input-sm"
              />

              <select
                value={attrCategory}
                onChange={(e) => setAttrCategory(e.target.value)}
                className="select select-bordered w-full select-sm"
              >
                <option value="">-- All Categories --</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {recentlyUsedIds.length > 0 && (
              <div className="border-t border-base-300 pt-2 flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Recently Used
                </span>
                <div className="flex flex-wrap gap-1">
                  {recentlyUsedIds
                    .map((id) => libraryAttributes.find((la) => la.id === id))
                    .filter(
                      (la) =>
                        la && !attributes.some((a) => a.attributeId === la.id),
                    )
                    .map((la) => (
                      <button
                        key={la.id}
                        onClick={() => handleAddAttribute(la.id)}
                        className="btn btn-xs btn-outline btn-neutral"
                      >
                        {la.name}
                      </button>
                    ))}
                </div>
              </div>
            )}

            <div className="border-t border-base-300 pt-2 flex-1 max-h-56 overflow-y-auto pr-1 flex flex-col gap-2 mt-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Available Attributes
              </span>
              {filteredLibraryAttrs.length === 0 ? (
                <p className="text-xs text-gray-500 italic py-2">
                  No matching library attributes found.
                </p>
              ) : (
                filteredLibraryAttrs.map((la) => (
                  <div
                    key={la.id}
                    className="flex justify-between items-center p-2 hover:bg-base-200 rounded border border-base-300 bg-base-100"
                  >
                    <div>
                      <span className="font-semibold text-xs">{la.name}</span>
                      <span className="text-[10px] text-gray-400 block">
                        {la.category} | {la.type}
                      </span>
                    </div>
                    <button
                      onClick={() => handleAddAttribute(la.id)}
                      className="btn btn-xs btn-primary text-[10px]"
                    >
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4 border-t border-base-300 pt-3">
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setAttrSearch("");
                  setAttrCategory("");
                }}
                className="btn btn-neutral btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSave={handleProjectSave}
        projectToEdit={projectToEdit}
        userVersion={profileUser?.version}
      />

      <CreateCVModal
        isOpen={isCVModalOpen}
        onClose={() => setIsCVModalOpen(false)}
        onSave={handleCVGenerated}
      />
    </div>
  );
};

export default Profile;
