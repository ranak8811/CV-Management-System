import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../utils/api";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import AttributeModal from "../../components/AttributeModal";
import Table from "../../components/Table";
import useLanguage from "../../hooks/useLanguage";
import useTitle from "../../hooks/useTitle";

const AttributesList = () => {
  useTitle("Attribute Library");
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [attributeToEdit, setAttributeToEdit] = useState(null);

  const [prevSearch, setPrevSearch] = useState("");
  const [prevCategory, setPrevCategory] = useState("");

  if (search !== prevSearch || category !== prevCategory) {
    setPrevSearch(search);
    setPrevCategory(category);
    setPage(1);
    setSelectedIds([]);
  }

  const categories = [
    "Certification",
    "Domain Knowledge",
    "Personal Information",
    "Soft Skills",
    "Technical Skills",
  ];

  const { data, isLoading } = useQuery({
    queryKey: ["attributes", { search, category, page }],
    queryFn: async () => {
      const res = await api.get(
        `/api/attributes?search=${search}&category=${category}&page=${page}&limit=10`
      );
      return res.data.success ? res.data : { data: [], pagination: null };
    },
  });

  const attributes = data?.data || [];
  const pagination = data?.pagination || null;

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

  const handleSelectAll = (checked, visibleRows) => {
    const visibleIds = visibleRows.map((r) => r.id);
    if (checked) {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    } else {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
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

  const columns = [
    {
      header: t("attributeName"),
      accessor: "name",
      render: (row) => <span className="font-bold">{row.name}</span>,
    },
    { header: t("category"), accessor: "category" },
    {
      header: t("dataType"),
      accessor: "type",
      render: (row) => <span className="badge badge-outline">{row.type}</span>,
    },
    {
      header: t("dropdownOptions", "Dropdown Options"),
      render: (row) =>
        row.type === "DROPDOWN" && row.options
          ? row.options.map((opt) => opt.value).join(", ")
          : "-",
    },
  ];

  return (
    <div className="p-4 font-sans bg-base-100 text-base-content min-h-screen">
      <h2 className="text-2xl font-bold mb-6">{t("attributesListTitle")}</h2>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input input-bordered w-full md:w-64"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="select select-bordered w-full md:w-64"
        >
          <option value="">{t("allCategories", "All Categories")}</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3 p-3 bg-base-200 border border-base-300 rounded-md mb-4 justify-between">
        <div className="text-sm font-semibold">
          {t("selectedRows")}: <span className="text-primary">{selectedIds.length}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAddNewClick} className="btn btn-sm btn-primary">
            + {t("addNew")}
          </button>
          <button
            onClick={handleEditClick}
            disabled={selectedIds.length !== 1}
            className="btn btn-sm btn-neutral"
          >
            {t("edit")}
          </button>
          <button
            onClick={handleDeleteSelected}
            disabled={selectedIds.length === 0 || deleteMutation.isPending}
            className="btn btn-sm btn-error"
          >
            {deleteMutation.isPending ? t("deleting", "Deleting...") : t("delete")}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center p-8">{t("loadingAttributes", "Loading Attributes...")}</div>
      ) : (
        <Table
          columns={columns}
          data={attributes}
          selectedIds={selectedIds}
          onSelectRow={handleSelectRow}
          onSelectAll={handleSelectAll}
          pagination={pagination}
          onPageChange={(newPage) => setPage(newPage)}
        />
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
