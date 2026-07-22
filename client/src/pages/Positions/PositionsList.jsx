import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import api from "../../utils/api";
import Loading from "../../components/Loading";
import useAuth from "../../hooks/useAuth";
import Table from "../../components/Table";
import useLanguage from "../../hooks/useLanguage";
import useTitle from "../../hooks/useTitle";

const PositionsList = () => {
  useTitle("Positions");
  const location = useLocation();
  return <PositionsListInner key={location.search} />;
};

const PositionsListInner = () => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isRecruiterOrAdmin =
    user && (user.role === "RECRUITER" || user.role === "ADMIN");
  const navigate = useNavigate();
  const location = useLocation();

  const getQueryParam = () => {
    const params = new URLSearchParams(location.search);
    return params.get("search") || "";
  };

  const [search, setSearch] = useState(() => getQueryParam());
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  const [prevSearch, setPrevSearch] = useState(() => getQueryParam());

  if (search !== prevSearch) {
    setPrevSearch(search);
    setPage(1);
    setSelectedIds([]);
  }

  const { data, isLoading } = useQuery({
    queryKey: ["positions", { search, page }],
    queryFn: async () => {
      const res = await api.get(
        `/api/positions?search=${search}&page=${page}&limit=10`
      );
      return res.data.success ? res.data : { data: [], pagination: null };
    },
  });

  const positions = data?.data || [];
  const pagination = data?.pagination || null;

  const deleteMutation = useMutation({
    mutationFn: async (ids) => {
      for (const id of ids) {
        await api.delete(`/api/positions/${id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      toast.success("Selected position(s) deleted successfully!");
      setSelectedIds([]);
    },
    onError: (err) => {
      console.error("Delete error:", err);
      toast.error("Some positions could not be deleted");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.post(`/api/positions/${id}/duplicate`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      toast.success(data.message || "Position duplicated successfully!");
      setSelectedIds([]);
    },
    onError: (err) => {
      console.error("Duplicate error:", err);
      toast.error(err.response?.data?.message || "Failed to duplicate position");
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
      text: `You are about to delete ${selectedIds.length} position(s). This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, delete!",
    });

    if (!result.isConfirmed) return;

    deleteMutation.mutate(selectedIds);
  };

  const handleDuplicateSelected = () => {
    if (selectedIds.length !== 1) return;
    duplicateMutation.mutate(selectedIds[0]);
  };

  const handleAddNewClick = () => {
    navigate("/dashboard/positions/new");
  };

  const handleEditClick = () => {
    if (selectedIds.length !== 1) return;
    navigate(`/dashboard/positions/edit/${selectedIds[0]}`);
  };

  const columns = [
    {
      header: t("title", "Title"),
      accessor: "title",
      render: (row) => (
        <span
          onClick={() =>
            navigate(
              user ? `/dashboard/positions/${row.id}` : `/positions/${row.id}`
            )
          }
          className="font-bold text-primary hover:underline cursor-pointer"
        >
          {row.title}
        </span>
      ),
    },
    {
      header: t("description", "Description"),
      accessor: "description",
      className: "max-w-xs truncate",
    },
    {
      header: t("visibility", "Visibility"),
      accessor: "isPublic",
      render: (row) => (
        <span
          className={`badge ${row.isPublic ? "badge-success" : "badge-warning"} badge-sm`}
        >
          {row.isPublic ? t("public", "Public") : t("restricted", "Restricted")}
        </span>
      ),
    },
    {
      header: t("accessRules", "Access Rules"),
      render: (row) => {
        if (row.isPublic) {
          return (
            <span className="text-gray-400 italic text-xs">{t("nonePublic", "None (Public)")}</span>
          );
        }
        if (!row.accessRules || row.accessRules.length === 0) {
          return (
            <span className="text-gray-400 italic text-xs">
              {t("noRulesDefined", "No rules defined")}
            </span>
          );
        }
        return (
          <div className="flex flex-wrap gap-1">
            {row.accessRules.map((rule) => (
              <span
                key={rule.id}
                className="bg-base-300 text-base-content text-[10px] px-2 py-0.5 rounded font-medium border-none"
              >
                {rule.attribute?.name} {rule.operator.replace("_", " ")}{" "}
                {rule.value}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      header: t("attributesIncluded", "Attributes Included"),
      render: (row) => (
        <span className="badge badge-outline">
          {row.positionAttributes?.length || 0}
        </span>
      ),
    },
    {
      header: t("submittedCVs", "Submitted CVs"),
      render: (row) => (
        <span className="font-semibold text-primary">
          {row._count?.cvs || 0}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 font-sans bg-base-100 text-base-content min-h-screen max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">{t("positionsListTitle")}</h2>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input input-bordered w-full md:w-64"
        />
      </div>

      {isRecruiterOrAdmin && (
        <div className="flex items-center gap-3 p-3 bg-base-200 border border-base-300 rounded-md mb-4 justify-between">
          <div className="text-sm font-semibold">
            {t("selectedRows")}: <span className="text-primary">{selectedIds.length}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddNewClick}
              className="btn btn-sm btn-primary"
            >
              + {t("addNew")}
            </button>

            <button
              onClick={handleDuplicateSelected}
              disabled={selectedIds.length !== 1 || duplicateMutation.isPending}
              className="btn btn-sm btn-neutral"
            >
              {t("duplicate")}
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
              {t("delete")}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center p-8">
          <Loading />
          <span className="block mt-2">{t("loadingPositions", "Loading Positions...")}</span>
        </div>
      ) : (
        <Table
          columns={columns}
          data={positions}
          selectedIds={selectedIds}
          onSelectRow={isRecruiterOrAdmin ? handleSelectRow : null}
          onSelectAll={isRecruiterOrAdmin ? handleSelectAll : null}
          pagination={pagination}
          onPageChange={(newPage) => setPage(newPage)}
        />
      )}
    </div>
  );
};

export default PositionsList;
