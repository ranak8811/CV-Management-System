import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../utils/api";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import Loading from "../../components/Loading";
import useAuth from "../../hooks/useAuth";
import Table from "../../components/Table";
import useLanguage from "../../hooks/useLanguage";
import useTitle from "../../hooks/useTitle";

const UsersManagement = () => {
  useTitle("Users Management");
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", { page }],
    queryFn: async () => {
      const res = await api.get(`/api/admin/users?page=${page}&limit=10`);
      return res.data.success ? res.data : { data: [], pagination: null };
    },
  });

  const users = data?.data || [];
  const pagination = data?.pagination || null;

  const blockMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.post(`/api/admin/users/${id}/block`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(data.message || "User block state updated");
      setSelectedIds([]);
    },
    onError: (err) => {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Failed to update block state"
      );
    },
  });

  const roleMutation = useMutation({
    mutationFn: async ({ id, role }) => {
      const res = await api.put(`/api/admin/users/${id}/role`, { role });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(data.message || "User role updated successfully");
      setSelectedIds([]);
    },
    onError: (err) => {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update user role");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/api/admin/users/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(data.message || "User deleted successfully");
      setSelectedIds([]);
    },
    onError: (err) => {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to delete user");
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

  const handleBlockToggle = () => {
    if (selectedIds.length !== 1) return;
    const targetId = selectedIds[0];
    if (targetId === currentUser.id) {
      toast.error("You cannot block yourself!");
      return;
    }
    blockMutation.mutate(targetId);
  };

  const handleChangeRole = async () => {
    if (selectedIds.length !== 1) return;
    const targetId = selectedIds[0];
    const targetUser = users.find((u) => u.id === targetId);

    const { value: role } = await Swal.fire({
      title: "Change User Role",
      input: "select",
      inputOptions: {
        CANDIDATE: "Candidate",
        RECRUITER: "Recruiter",
        ADMIN: "Admin",
      },
      inputValue: targetUser.role,
      inputPlaceholder: "Select role",
      showCancelButton: true,
      confirmButtonColor: "#2563EB",
      cancelButtonColor: "#6B7280",
    });

    if (role) {
      roleMutation.mutate({ id: targetId, role });
    }
  };

  const handleDeleteUsers = async () => {
    if (selectedIds.length === 0) return;

    const hasSelf = selectedIds.includes(currentUser.id);
    if (hasSelf) {
      toast.error("You cannot delete your own admin account!");
      return;
    }

    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Delete ${selectedIds.length} selected user account(s)? This will also wipe all CVs, projects, and discussions for these users.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, delete!",
    });

    if (!result.isConfirmed) return;

    for (const id of selectedIds) {
      deleteMutation.mutate(id);
    }
  };

  const columns = [
    {
      header: t("userName", "Name"),
      accessor: "name",
      render: (row) => <span className="font-bold">{row.name}</span>,
    },
    { header: t("userEmail", "Email"), accessor: "email" },
    {
      header: t("userRole", "Role"),
      accessor: "role",
      render: (row) => (
        <span className="badge badge-neutral badge-md">{row.role}</span>
      ),
    },
    {
      header: t("status", "Status"),
      accessor: "isBlocked",
      render: (row) => (
        <span
          className={`badge ${row.isBlocked ? "badge-error" : "badge-success"} text-white badge-md`}
        >
          {row.isBlocked ? t("blocked", "Blocked") : t("active", "Active")}
        </span>
      ),
    },
    {
      header: t("submittedOn", "Created At"),
      render: (row) => (
        <span>{new Date(row.createdAt).toLocaleDateString()}</span>
      ),
    },
  ];

  return (
    <div className="p-4 font-sans bg-base-100 text-base-content min-h-screen">
      <h2 className="text-2xl font-bold mb-6">{t("usersManagementTitle")}</h2>

      <div className="flex items-center gap-3 p-3 bg-base-200 border border-base-300 rounded-md mb-4 justify-between">
        <div className="text-sm font-semibold">
          {t("selectedRows")}: <span className="text-primary">{selectedIds.length}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleBlockToggle}
            disabled={selectedIds.length !== 1 || blockMutation.isPending}
            className="btn btn-sm btn-neutral"
          >
            {t("blockUnblock", "Block / Unblock")}
          </button>
          <button
            onClick={handleChangeRole}
            disabled={selectedIds.length !== 1 || roleMutation.isPending}
            className="btn btn-sm btn-primary"
          >
            {t("changeRole", "Change Role")}
          </button>
          <button
            onClick={handleDeleteUsers}
            disabled={selectedIds.length === 0}
            className="btn btn-sm btn-error"
          >
            {t("deleteUser", "Delete User")}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center p-8">
          <Loading />
          <span className="block mt-2">{t("loadingUsers", "Loading users registry...")}</span>
        </div>
      ) : (
        <Table
          columns={columns}
          data={users}
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

export default UsersManagement;
