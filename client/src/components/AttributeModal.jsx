import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../utils/api";

const AttributeModal = ({ isOpen, onClose, onSave, attributeToEdit }) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Certification");
  const [type, setType] = useState("STRING");

  const [options, setOptions] = useState([]);
  const [optionInput, setOptionInput] = useState("");

  const categories = [
    "Certification",
    "Domain Knowledge",
    "Personal Information",
    "Soft Skills",
    "Technical Skills",
  ];
  const types = [
    "STRING",
    "TEXT",
    "IMAGE",
    "NUMERIC",
    "DATE",
    "PERIOD",
    "BOOLEAN",
    "DROPDOWN",
  ];

  useEffect(() => {
    if (attributeToEdit) {
      setName(attributeToEdit.name);
      setCategory(attributeToEdit.category);
      setType(attributeToEdit.type);
      setOptions(
        attributeToEdit.options
          ? attributeToEdit.options.map((opt) => opt.value)
          : [],
      );
    } else {
      setName("");
      setCategory("Certification");
      setType("STRING");
      setOptions([]);
    }

    setOptionInput("");
  }, [attributeToEdit, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleAddOption = (e) => {
    e.preventDefault();

    const trimmed = optionInput.trim();

    if (!trimmed) return;

    if (options.includes(trimmed)) {
      toast.error("Option already exists");
      return;
    }

    setOptions([...options, trimmed]);
    setOptionInput("");
  };

  const handleRemoveOption = (indexToRemove) => {
    setOptions(options.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error("Attribute Name is required");
      return;
    }

    if (type === "DROPDOWN" && options.length === 0) {
      toast.error("Dropdown must have at least one option");
      return;
    }

    try {
      if (attributeToEdit) {
        const res = await api.put(`/api/attributes/${attributeToEdit.id}`, {
          name: trimmedName,
          category,
          options: type === "DROPDOWN" ? options : [],
        });

        if (res.data.success) {
          toast.success("Attribute updated successfully!");
          onSave();
        }
      } else {
        const res = await api.post("/api/attributes", {
          name: trimmedName,
          category,
          type,
          options: type === "DROPDOWN" ? options : [],
        });

        if (res.data.success) {
          toast.success("Attribute created successfully!");
          onSave();
        }
      }
    } catch (error) {
      console.error("Save attribute error:", error);
      toast.error(error.response?.data?.message || "Failed to save attribute");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 text-base-content border border-base-300 p-6 rounded-lg w-full max-w-md shadow-lg flex flex-col gap-4">
        <h3 className="text-lg font-bold">
          {attributeToEdit ? "Edit Attribute" : "Create New Attribute"}
        </h3>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold">Attribute Name</label>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input input-bordered w-full"
              placeholder="e.g. IELTS Score"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold">Category</label>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="select select-borderd w-full"
            >
              {categories.map((cat) => (
                <option value={cat} key={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold">Data Type</label>

            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={!!attributeToEdit}
              className="select select-bordered w-full"
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {type === "DROPDOWN" && (
            <div className="border border-base-300 p-3 rounded-md flex flex-col gap-2 bg-base-200">
              <label className="text-sm font-semibold">Dropdown Options</label>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={optionInput}
                  onChange={(e) => setOptionInput(e.target.value)}
                  className="input input-bordered input-sm flex-1"
                  placeholder="e.g. Advanced"
                />
                <button
                  onClick={handleAddOption}
                  className="btn btn-sm btn-primary"
                >
                  + Add
                </button>
              </div>

              <div className="flex flex-wrap gap-1 mt-2">
                {options.map((opt, index) => (
                  <span
                    key={index}
                    className="badge badge-neutral gap-2 p-3 rounded-full text-xs"
                  >
                    {opt}
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="text-red-500 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={onClose} className="btn btn-neutral">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AttributeModal;
