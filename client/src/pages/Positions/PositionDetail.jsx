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

  return <div></div>;
};

export default PositionDetail;
