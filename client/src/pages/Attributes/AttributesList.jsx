import { useState } from "react";
import api from "../../utils/api";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import AttributeModal from "../../components/AttributeModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const AttributesList = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [attributeToEdit, setAttributeToEdit] = useState(null);

  const categories = [
    "Certification",
    "Domain Knowledge",
    "Personal Information",
    "Soft Skills",
    "Technical Skills",
  ];

  const { data: attributes = [], isLoading } = useQuery({
    queryKey: ["attributes", { search, category }],
    queryFn: async () => {
      const res = await api.get(
        `/api/attributes?search=${search}&category=${category}`,
      );
      return res.data.success ? res.data.data : [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids) => {
      for (const id of ids) {
        await api.delete(`/api/attributes/${id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attributes"] });
      toast.success("Selected attribute(s) deleted successfully!");
      setSelectedIds([]);
    },
    onError: (err) => {
      console.error("Delete error:", err);
      toast.error("Some attributes could not be deleted");
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
      setSelectedIds(attributes.map((attr) => attr.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;

    const result = await Swal.fire({
      title: "Are you sure?",
      text: `You are about to delete ${selectedIds.length} attribute(s). This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, delete!",
    });

    if (!result.isConfirmed) return;

    deleteMutation.mutate(selectedIds);
  };

  const handleAddNewClick = () => {
    setAttributeToEdit(null);
    setIsModalOpen(true);
  };

  const handleEditClick = () => {
    if (selectedIds.length !== 1) return;
    const target = attributes.find((attr) => attr.id === selectedIds[0]);
    setAttributeToEdit(target);
    setIsModalOpen(true);
  };

  const handleModalSave = () => {
    setIsModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ["attributes"] });
    setSelectedIds([]);
  };

  return (
    <div className="p-4 font-sans bg-base-100 text-base-content min-h-screen">
      <h2 className="text-2xl font-bold mb-6">Attribute Library</h2>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by prefix..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedIds([]);
          }}
          className="input input-bordered w-full md:w-64"
        />
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setSelectedIds([]);
          }}
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
          <button
            onClick={handleAddNewClick}
            className="btn btn-sm btn-primary"
          >
            + Add New
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
            disabled={selectedIds.length === 0 || deleteMutation.isPending}
            className="btn btn-sm btn-error"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      {isLoading ? (
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

      <AttributeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleModalSave}
        attributeToEdit={attributeToEdit}
      />
    </div>
  );
};

export default AttributesList;
