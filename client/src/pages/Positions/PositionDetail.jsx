import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import Loading from "../../components/Loading";
import useAuth from "../../hooks/useAuth";
import { marked } from "marked";
import { io } from "socket.io-client";

const PositionDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [position, setPosition] = useState(null);
  const [activeTab, setActiveTab] = useState("details");
  const [loading, setLoading] = useState(true);

  const [posts, setPosts] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const [cvs, setCvs] = useState([]);
  const [loadingCVs, setLoadingCVs] = useState(false);
  const [selectedCVIds, setSelectedCVIds] = useState([]);

  const isRecruiterOrAdmin =
    user && (user.role === "RECRUITER" || user.role === "ADMIN");
  const scrollRef = useRef(null);

  useEffect(() => {
    const loadPositionData = async () => {
      try {
        const res = await api.get(`/api/positions/${id}`);
        if (res.data.success) {
          setPosition(res.data.data);
        }
      } catch (err) {
        console.error("Load position error:", err);
        toast.error("Failed to load position details");
        navigate("/dashboard/positions");
      } finally {
        setLoading(false);
      }
    };
    loadPositionData();
  }, [id, navigate]);

  useEffect(() => {
    if (!position) return;

    const fetchPosts = async () => {
      try {
        const res = await api.get(`/api/discussions/${id}`);
        if (res.data.success) {
          setPosts(res.data.data);
        }
      } catch (err) {
        console.error("Fetch posts error:", err);
      }
    };
    fetchPosts();

    const socketUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace("/api", "")
      : "http://localhost:5000";

    const socket = io(socketUrl);

    socket.emit("joinPosition", id);

    socket.on("newPost", (newPost) => {
      setPosts((prev) => {
        if (prev.some((p) => p.id === newPost.id)) return prev;
        return [...prev, newPost];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [id, position]);

  useEffect(() => {
    if (activeTab === "cvs" && isRecruiterOrAdmin && position) {
      const loadCVs = async () => {
        setLoadingCVs(true);
        try {
          const res = await api.get(`/api/cvs/position/${id}`);
          if (res.data.success) {
            setCvs(res.data.data);
          }
        } catch (err) {
          console.error(err);
          toast.error("Failed to load submitted CVs");
        } finally {
          setLoadingCVs(false);
        }
      };
      loadCVs();
    }
  }, [activeTab, id, position, isRecruiterOrAdmin]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [posts]);

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      await api.post(`/api/discussions/${id}`, {
        content: newComment,
      });
      setNewComment("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to post comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSelectCV = (cvId) => {
    if (selectedCVIds.includes(cvId)) {
      setSelectedCVIds(selectedCVIds.filter((item) => item !== cvId));
    } else {
      setSelectedCVIds([...selectedCVIds, cvId]);
    }
  };

  const handleSelectAllCVs = (e) => {
    if (e.target.checked) {
      setSelectedCVIds(cvs.map((c) => c.id));
    } else {
      setSelectedCVIds([]);
    }
  };

  const handleOpenSelectedCV = () => {
    if (selectedCVIds.length !== 1) return;
    navigate(`/dashboard/cvs/${selectedCVIds[0]}`);
  };

  const handleDeleteSelectedCVs = async () => {
    if (selectedCVIds.length === 0) return;

    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Delete ${selectedCVIds.length} submitted CV(s)?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, delete!",
    });

    if (!result.isConfirmed) return;

    try {
      for (const cvId of selectedCVIds) {
        const targetCV = cvs.find((c) => c.id === cvId);
        await api.delete(`/api/cvs/${cvId}`, {
          data: { version: targetCV.version || 1 },
        });
      }
      toast.success("CV(s) deleted successfully!");
      setCvs((prev) => prev.filter((c) => !selectedCVIds.includes(c.id)));
      setSelectedCVIds([]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete selected CVs");
    }
  };

  const exportCVsToCSV = async () => {
    if (cvs.length === 0) {
      toast.error("No CVs available to export");
      return;
    }

    try {
      const allCVDetails = [];
      for (const cvItem of cvs) {
        const res = await api.get(`/api/cvs/${cvItem.id}`);
        if (res.data.success) {
          allCVDetails.push(res.data.data);
        }
      }

      const headers = [
        "Candidate Name",
        "Candidate Email",
        "CV Profile Name",
        "Published Status",
        "Likes Count",
      ];
      const attrNames = [];

      position.positionAttributes.forEach((pa) => {
        attrNames.push(pa.attribute.name);
      });

      const fullHeaders = [...headers, ...attrNames];

      const csvRows = [fullHeaders.join(",")];

      allCVDetails.forEach((item) => {
        const { cv: cvData, attributeValues } = item;
        const rowData = [
          `"${cvData.candidate.name || ""}"`,
          `"${cvData.candidate.email || ""}"`,
          `"${cvData.name.replace(/"/g, '""')}"`,
          `"${cvData.isPublished ? "Published" : "Draft"}"`,
          cvData.likes ? cvData.likes.length : 0,
        ];

        position.positionAttributes.forEach((pa) => {
          const matchedAttr = attributeValues.find(
            (av) => av.attributeId === pa.attributeId,
          );
          const val = matchedAttr ? matchedAttr.value.replace(/"/g, '""') : "";
          rowData.push(`"${val}"`);
        });

        csvRows.push(rowData.join(","));
      });

      const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `${position.title.replace(/\s+/g, "_")}_Submissions.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV export complete!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export submitted CVs");
    }
  };

  if (loading) {
    return (
      <div className="text-center p-8">
        <Loading />
        <span className="block mt-2">Loading position details...</span>
      </div>
    );
  }

  return <div></div>;
};

export default PositionDetail;
