import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../utils/api";
import toast from "react-hot-toast";
import Loading from "../../components/Loading";

const CVsList = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const getQueryParam = () => {
    const params = new URLSearchParams(location.search);
    return params.get("search") || "";
  };

  const [search, setSearch] = useState(getQueryParam());
  const [category, setCategory] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    setSearch(getQueryParam());
    setSelectedIds([]);
  }, [location.search]);

  const { data: cvs = [], isLoading } = useQuery({
    queryKey: ["admin-cvs-list", { search, category }],
    queryFn: async () => {
      const res = await api.get(
        `/api/cvs?search=${search}&category=${category}`,
      );
      return res.data.success ? res.data.data : [];
    },
  });
  const { data: libraryAttributes = [] } = useQuery({
    queryKey: ["attributes"],
    queryFn: async () => {
      const res = await api.get("/api/attributes");
      return res.data.success ? res.data.data : [];
    },
  });

  const categories = Array.from(
    new Set(libraryAttributes.map((a) => a.category)),
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

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(cvs.map((c) => c.id));
    } else {
      setSelectedIds([]);
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

  return <div></div>;
};

export default CVsList;
