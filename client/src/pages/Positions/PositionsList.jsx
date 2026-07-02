import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../utils/api";

const PositionsList = () => {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const fetchPositions = async () => {
      setLoading(true);

      try {
        const res = await api.get(`/api/positions?search=${search}`);

        if (active && res.data.success) {
          setPositions(res.data.data);
          setSelectedIds([]);
        }
      } catch (error) {
        console.error("Fetch positions error:", error);
        toast.error("Failed to load positions");
      }

      if (active) setLoading(false);
    };

    fetchPositions();

    return () => {
      active = false;
    };
  }, [search, refreshTrigger]);

  const handleSelectRow = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(positions.map((pos) => pos.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleDeleteSelected = async () => {
    if (setSelectedIds.length === 0) return;

    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedIds.length} positions`,
      )
    )
      return;

    try {
      for (const id of selectedIds) {
        await api.delete(`/api/positions/${id}`);
      }

      toast.success("Selected position(s) deleted successfully!");
      setSelectedIds([]);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Delete position error:", error);
      toast.error("Some positions could not be deleted");
    }
  };

  const handleDuplicateSelected = async () => {
    if (selectedIds.length !== 1) return;

    const targetId = selectedIds[0];

    try {
      const res = await api.post(`/api/positions/${targetId}/duplicate`);

      if (res.data.success) {
        toast.success("Position duplicated successfully!");
        setSelectedIds([]);
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Duplicate error:", error);
      toast.error("Failed to duplicate position");
    }
  };

  const handleAddNewClick = () => {
    navigate("/dashboard/positions/new");
  };

  const handleEditClick = () => {
    if (selectedIds.length !== 1) return;

    navigate(`/dashboard/positions/edit/${selectedIds[0]}`);
  };

  return <div></div>;
};

export default PositionsList;
