import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useAuth from "../../hooks/useAuth";
import { useState } from "react";
import api from "../../utils/api";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import Loading from "../../components/Loading";

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
      console.log(err);
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

  return <div></div>;
};

export default UsersManagement;
