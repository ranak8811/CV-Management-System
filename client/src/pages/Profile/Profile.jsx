import { useState, useEffect } from "react";
import api from "../../utils/api";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import Loading from "../../components/Loading";

const Profile = () => {
  const [profileUser, setProfileUser] = useState(null);
  const [attributes, setAttributes] = useState([]);
  const [libraryAttributes, setLibraryAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const res = await api.get("/api/profile");
        if (res.data.success) {
          setProfileUser(res.data.data.user);
          setAttributes(res.data.data.attributes);
        }
        const libRes = await api.get("/api/attributes");
        if (libRes.data.success) {
          setLibraryAttributes(libRes.data.data);
        }
      } catch (err) {
        console.error("Profile load failed:", err);
        toast.error("Failed to load profile details");
      } finally {
        setLoading(false);
      }
    };
    loadProfileData();
  }, []);

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
        setProfileUser((prev) => ({ ...prev, version: currentVersion }));
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
  }, [unsavedChanges, profileUser?.version]);

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
    const data = await response.json();
    if (data.success) {
      return data.data.url;
    }
    throw new Error("ImgBB upload failed");
  };

  const handleInputChange = (attrId, val) => {
    setAttributes((prev) =>
      prev.map((attr) =>
        attr.attributeId === attrId ? { ...attr, value: val } : attr,
      ),
    );
    setUnsavedChanges((prev) => ({
      ...prev,
      [attrId]: val,
    }));
  };

  const handleImageUpload = async (attrId, file) => {
    if (!file) return;
    setUploadingImage(true);
    try {
      const url = await uploadImageObj(file);
      handleInputChange(attrId, url);
      toast.success("Image uploaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddAttribute = async (attrId) => {
    try {
      const res = await api.post("/api/profile/attribute/add", {
        attributeId: attrId,
        version: profileUser.version,
      });

      if (res.data.success) {
        setProfileUser((prev) => ({ ...prev, version: res.data.newVersion }));
        const libAttr = libraryAttributes.find((la) => la.id === attrId);
        setAttributes((prev) => [
          ...prev,
          {
            attributeId: attrId,
            value: "",
            attribute: libAttr,
          },
        ]);
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
        setProfileUser((prev) => ({ ...prev, version: res.data.newVersion }));
        setAttributes((prev) => prev.filter((a) => a.attributeId !== attrId));
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

  if (loading) {
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

  const renderInputField = (attr) => {
    const { type, name, options } = attr.attribute;
    const value = attr.value;

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
              disabled={uploadingImage}
              onChange={(e) =>
                handleImageUpload(attr.attributeId, e.target.files[0])
              }
              className="file-input file-input-bordered file-input-sm w-full"
            />
          </div>
        );
      case "STRING":
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

  return (
    <div className="p-4 font-sans bg-base-100 text-base-content min-h-screen max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">My Personal Profile</h2>
        {saving && (
          <span className="text-xs text-primary flex items-center gap-1">
            <span className="loading loading-spinner loading-xs"></span>
            Saving...
          </span>
        )}
      </div>

      <div className="border border-base-300 p-6 rounded-lg bg-base-200 mb-6 flex flex-col gap-4">
        <h3 className="text-lg font-bold border-b border-base-300 pb-2">
          Me (Undeletable Attributes)
        </h3>
        {meAttrs.map((attr) => (
          <div key={attr.attributeId} className="flex flex-col gap-1">
            <label className="text-sm font-semibold">
              {attr.attribute.name}
            </label>
            {renderInputField(attr)}
          </div>
        ))}
      </div>

      <div className="border border-base-300 p-6 rounded-lg bg-base-200 flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-base-300 pb-2">
          <h3 className="text-lg font-bold">
            Info (Custom Library Attributes)
          </h3>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-sm btn-primary"
          >
            + Add Attribute
          </button>
        </div>

        {infoAttrs.length === 0 ? (
          <p className="text-sm text-gray-500">
            No custom attributes added yet.
          </p>
        ) : (
          infoAttrs.map((attr) => (
            <div
              key={attr.attributeId}
              className="border border-base-300 p-4 rounded bg-base-100 flex flex-col gap-2"
            >
              <div>
                <label className="text-sm font-semibold">
                  {attr.attribute.name}
                </label>
                <span className="text-xs text-gray-400 block mt-0.5">
                  Category: {attr.attribute.category} | Type:{" "}
                  {attr.attribute.type}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">{renderInputField(attr)}</div>
                <button
                  type="button"
                  onClick={() => handleRemoveAttribute(attr.attributeId)}
                  className="btn btn-error btn-sm text-white"
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-base-100 text-base-content border border-base-300 p-6 rounded-lg w-full max-w-md shadow-lg flex flex-col gap-4">
            <h3 className="text-lg font-bold">Add Custom Attribute</h3>

            {availableLibraryAttrs.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">
                No other library attributes available to add.
              </p>
            ) : (
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                {availableLibraryAttrs.map((la) => (
                  <div
                    key={la.id}
                    className="flex justify-between items-center p-2 hover:bg-base-200 rounded border border-base-300"
                  >
                    <div>
                      <span className="font-semibold text-sm">{la.name}</span>
                      <span className="text-xs text-gray-400 block">
                        {la.category} | {la.type}
                      </span>
                    </div>
                    <button
                      onClick={() => handleAddAttribute(la.id)}
                      className="btn btn-xs btn-primary"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="btn btn-neutral"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
