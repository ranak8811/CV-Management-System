import { useState } from "react";
import toast from "react-hot-toast";
import api from "../../utils/api";
import { useEffect } from "react";

const AttributesList = () => {
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  const [selectedIds, setSelectedIds] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const categories = [
    "Certification",
    "Domain Knowledge",
    "Personal Information",
    "Soft Skills",
    "Technical Skills",
  ];

  useEffect(() => {
    let active = true;
    const fetchAttributes = async () => {
      setLoading(true);
      try {
        const res = await api.get(
          `/api/attributes?search=${search}&category=${category}`,
        );
        if (active && res.data.success) {
          setAttributes(res.data.data);
          setSelectedIds([]); // Asynchronously clear selection when fetch succeeds
        }
      } catch (error) {
        console.error("Fetch attributes error:", error);
        toast.error("Failed to load attributes");
      }
      if (active) setLoading(false);
    };

    fetchAttributes();

    return () => {
      active = false;
    };
  }, [search, category, refreshTrigger]);

  const handleSelectRow = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(attributes.map((attr) => attr.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;

    if (
      !window.confirm(
        `Are you sure want to delete ${selectedIds.length} attribute(s)`,
      )
    )
      return;

    try {
      for (const id of selectedIds) {
        await api.delete(`/api/attributes/${id}`);
      }

      toast.success("Selected attribute(s) deleted successfully!");
      setSelectedIds([]);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Some attributes could not be deleted");
    }
  };

  return (
    <div className="p-4 font-sans bg-base-100 text-base-content min-h-screen">
      <h2 className="text-2xl font-bold mb-6">Attribute Library</h2>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by prefix..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input input-bordered w-full md:w-64"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="select select-bordered w-full md:w-64"
        >
          <option value="">All Categories</option>
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
          <button className="btn btn-sm btn-primary">+ Add New</button>

          <button
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
        <div className="text-center p-8">Loading Attributes...</div>
      ) : attributes.length === 0 ? (
        <div className="text-center p-8 text-gray-500">
          No attributes found.
        </div>
      ) : (
        <div className="overflow-x-auto border border-base-300 rounded-md">
          <table className="table w-full">
            <thead>
              <tr className="bg-base-200">
                <th className="w-12 text-center">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.length === attributes.length &&
                      attributes.length > 0
                    }
                    onChange={handleSelectAll}
                    className="checkbox checkbox-sm"
                  />
                </th>
                <th>Name</th>
                <th>Category</th>
                <th>Data Type</th>
                <th>Dropdown Options</th>
              </tr>
            </thead>

            <tbody>
              {attributes.map((attr) => (
                <tr key={attr.id} className="hover:bg-base-200">
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(attr.id)}
                      onChange={() => handleSelectRow(attr.id)}
                      className="checkbox checkbox-sm"
                    />
                  </td>
                  <td className="font-bold">{attr.name}</td>
                  <td>{attr.category}</td>
                  <td>
                    <span className="badge badge-outline">{attr.type}</span>
                  </td>
                  <td className="text-sm">
                    {attr.type === "DROPDOWN"
                      ? attr.options.map((opt) => opt.value).join(", ")
                      : "-"}
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

export default AttributesList;
