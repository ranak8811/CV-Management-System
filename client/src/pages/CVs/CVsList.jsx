import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../utils/api";
import toast from "react-hot-toast";
import Loading from "../../components/Loading";
import Table from "../../components/Table";
import useLanguage from "../../hooks/useLanguage";

const CVsList = () => {
  const location = useLocation();
  return <CVsListInner key={location.search} />;
};

const CVsListInner = () => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const getQueryParam = () => {
    const params = new URLSearchParams(location.search);
    return params.get("search") || "";
  };

  const [search, setSearch] = useState(() => getQueryParam());
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  const [prevSearch, setPrevSearch] = useState(() => getQueryParam());
  const [prevCategory, setPrevCategory] = useState("");

  if (search !== prevSearch || category !== prevCategory) {
    setPrevSearch(search);
    setPrevCategory(category);
    setPage(1);
    setSelectedIds([]);
  }

  const { data, isLoading } = useQuery({
    queryKey: ["admin-cvs-list", { search, category, page }],
    queryFn: async () => {
      const res = await api.get(
        `/api/cvs?search=${search}&category=${category}&page=${page}&limit=10`
      );
      return res.data.success ? res.data : { data: [], pagination: null };
    },
  });

  const cvs = data?.data || [];
  const pagination = data?.pagination || null;

  const { data: libraryAttributes = [] } = useQuery({
    queryKey: ["attributes"],
    queryFn: async () => {
      const res = await api.get("/api/attributes");
      return res.data.success ? res.data.data : [];
    },
  });

  const categories = Array.from(
    new Set(libraryAttributes.map((a) => a.category))
  );

  const likeMutation = useMutation({
    mutationFn: async (cvId) => {
      const res = await api.post(`/api/cvs/${cvId}/like`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-cvs-list"] });
      toast.success(data.message || "CV Like toggled successfully");
      setSelectedIds([]);
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to toggle like");
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

  const handleOpenCV = () => {
    if (selectedIds.length !== 1) return;
    navigate(`/dashboard/cvs/${selectedIds[0]}`);
  };

  const handleLikeToggle = () => {
    if (selectedIds.length !== 1) return;
    likeMutation.mutate(selectedIds[0]);
  };

  const columns = [
    {
      header: t("candidateName"),
      accessor: "candidate",
      render: (row) => <span className="font-bold">{row.candidate?.name}</span>,
    },
    {
      header: t("cvProfileName"),
      accessor: "name",
      render: (row) => (
        <span
          onClick={() => navigate(`/dashboard/cvs/${row.id}`)}
          className="text-primary font-bold hover:underline cursor-pointer"
        >
          {row.name}
        </span>
      ),
    },
    {
      header: t("appliedPosition"),
      accessor: "position",
      render: (row) => <span>{row.position?.title}</span>,
    },
    {
      header: t("likesCount"),
      render: (row) => (
        <span className="badge badge-accent text-white">
          {row._count?.likes || 0} {t("likesCount")}
        </span>
      ),
    },
    {
      header: t("submittedOn"),
      render: (row) => (
        <span>{new Date(row.createdAt).toLocaleDateString()}</span>
      ),
    },
  ];

  return (
    <div className="p-4 font-sans bg-base-100 text-base-content min-h-screen">
      <h2 className="text-2xl font-bold mb-6">
        {t("cvsBrowserTitle")}
      </h2>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input input-bordered w-full md:w-96"
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
          <button
            onClick={handleOpenCV}
            disabled={selectedIds.length !== 1}
            className="btn btn-sm btn-primary"
          >
            {t("openCVDetails", "Open CV Details")}
          </button>
          <button
            onClick={handleLikeToggle}
            disabled={selectedIds.length !== 1 || likeMutation.isPending}
            className="btn btn-sm btn-neutral"
          >
            {t("likeUnlike", "Like / Unlike")}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center p-8">
          <Loading />
          <span className="block mt-2">{t("loadingCVs", "Loading CV database...")}</span>
        </div>
      ) : (
        <Table
          columns={columns}
          data={cvs}
          selectedIds={selectedIds}
          onSelectRow={handleSelectRow}
          onSelectAll={handleSelectAll}
          pagination={pagination}
          onPageChange={(newPage) => setPage(newPage)}
        />
      )}
    </div>
  );
};

export default CVsList;
