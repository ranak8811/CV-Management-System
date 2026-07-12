import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../utils/api";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import Loading from "../../components/Loading";
import useAuth from "../../hooks/useAuth";

const UsersManagement = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [selectedIds, setSelectedIds] = useState([]);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const res = await api.get("/api/admin/users");
      return res.data.success ? res.data.data : [];
    },
  });

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
        err.response?.data?.message || "Failed to update block state",
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

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(users.map((u) => u.id));
    } else {
      setSelectedIds([]);
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

  if (isLoading) {
    return (
      <div className="text-center p-8">
        <Loading />
        <span className="block mt-2">Loading users registry...</span>
      </div>
    );
  }

  return (
    <div className="p-4 font-sans bg-base-100 text-base-content min-h-screen">
      <h2 className="text-2xl font-bold mb-6">User Accounts Registry</h2>

      <div className="flex items-center gap-3 p-3 bg-base-200 border border-base-300 rounded-md mb-4 justify-between">
        <div className="text-sm font-semibold">
          Selected: <span className="text-primary">{selectedIds.length}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleBlockToggle}
            disabled={selectedIds.length !== 1 || blockMutation.isPending}
            className="btn btn-sm btn-neutral"
          >
            Block / Unblock
          </button>

          <button
            onClick={handleChangeRole}
            disabled={selectedIds.length !== 1 || roleMutation.isPending}
            className="btn btn-sm btn-primary"
          >
            Change Role
          </button>

          <button
            onClick={handleDeleteUsers}
            disabled={selectedIds.length === 0}
            className="btn btn-sm btn-error"
          >
            Delete User
          </button>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="text-center p-8 text-gray-500">
          No users registered in the system.
        </div>
      ) : (
        <div className="overflow-x-auto border border-base-300 rounded-md">
          <table className="table w-full bg-base-100 text-sm">
            <thead>
              <tr className="bg-base-300">
                <th className="w-12 text-center">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.length === users.length && users.length > 0
                    }
                    onChange={handleSelectAll}
                    className="checkbox checkbox-sm"
                  />
                </th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-base-200">
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(u.id)}
                      onChange={() => handleSelectRow(u.id)}
                      className="checkbox checkbox-sm"
                    />
                  </td>
                  <td className="font-bold">{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className="badge badge-neutral badge-md">
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${u.isBlocked ? "badge-error" : "badge-success"} text-white badge-md`}
                    >
                      {u.isBlocked ? "Blocked" : "Active"}
                    </span>
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;
