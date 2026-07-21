import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../utils/api";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import Loading from "../../components/Loading";
import useAuth from "../../hooks/useAuth";
import { marked } from "marked";
import { io } from "socket.io-client";
import useTitle from "../../hooks/useTitle";

const PositionDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("details");
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [selectedCVIds, setSelectedCVIds] = useState([]);

  const isRecruiterOrAdmin =
    user && (user.role === "RECRUITER" || user.role === "ADMIN");
  const scrollRef = useRef(null);

  const { data: position, isLoading } = useQuery({
    queryKey: ["position", id],
    queryFn: async () => {
      const res = await api.get(`/api/positions/${id}`);
      return res.data.success ? res.data.data : null;
    },
    onError: () => {
      toast.error("Failed to load position details");
      navigate(user ? "/dashboard/positions" : "/positions");
    },
  });

  useTitle(position ? position.title : "Position Details");

  const { data: posts = [] } = useQuery({
    queryKey: ["discussions", id],
    queryFn: async () => {
      const res = await api.get(`/api/discussions/${id}`);
      return res.data.success ? res.data.data : [];
    },
    enabled: !!user && !!position,
  });

  const { data: cvs = [], isLoading: loadingCVs } = useQuery({
    queryKey: ["position-cvs", id],
    queryFn: async () => {
      const res = await api.get(`/api/cvs/position/${id}`);
      return res.data.success ? res.data.data : [];
    },
    enabled: !!user && activeTab === "cvs" && isRecruiterOrAdmin && !!position,
  });

  useEffect(() => {
    if (!position || !user) return;

    const socketUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace("/api", "")
      : "http://localhost:5000";

    const socket = io(socketUrl);

    socket.emit("joinPosition", id);

    socket.on("newPost", (newPost) => {
      queryClient.setQueryData(["discussions", id], (oldPosts) => {
        if (!oldPosts) return [newPost];
        if (oldPosts.some((p) => p.id === newPost.id)) return oldPosts;
        return [...oldPosts, newPost];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [id, position, user, queryClient]);

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

  const deleteCVMutation = useMutation({
    mutationFn: async (cvId) => {
      const targetCV = cvs.find((c) => c.id === cvId);
      await api.delete(`/api/cvs/${cvId}`, {
        data: { version: targetCV.version || 1 },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["position-cvs", id] });
      toast.success("CV deleted successfully!");
      setSelectedCVIds([]);
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to delete selected CV(s)");
    },
  });

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

    for (const cvId of selectedCVIds) {
      deleteCVMutation.mutate(cvId);
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
      const attrNames = position.positionAttributes.map(
        (pa) => pa.attribute.name,
      );
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

  if (isLoading) {
    return (
      <div className="text-center p-8">
        <Loading />
        <span className="block mt-2">Loading position details...</span>
      </div>
    );
  }

  if (!position) {
    return (
      <div className="text-center p-8 text-error">Position not found.</div>
    );
  }

  const renderMarkdown = (text) => {
    return { __html: marked.parse(text || "") };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-4 font-sans bg-base-100 text-base-content min-h-screen max-w-4xl mx-auto flex flex-col gap-6">
      <div className="border-b border-base-300 pb-4">
        <div className="flex justify-between items-start">
          <h2 className="text-2xl font-bold text-primary">{position.title}</h2>
          <span
            className={`badge ${position.isPublic ? "badge-success" : "badge-warning"} badge-md`}
          >
            {position.isPublic ? "Public Position" : "Restricted Access"}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">{position.description}</p>
      </div>

      <div className="tabs tabs-boxed bg-base-200">
        <button
          onClick={() => setActiveTab("details")}
          className={`tab flex-1 ${activeTab === "details" ? "tab-active bg-primary text-primary-content" : ""}`}
        >
          Position Details
        </button>
        {user && (
          <button
            onClick={() => setActiveTab("discussion")}
            className={`tab flex-1 ${activeTab === "discussion" ? "tab-active bg-primary text-primary-content" : ""}`}
          >
            Discussions ({posts.length})
          </button>
        )}
        {user && isRecruiterOrAdmin && (
          <button
            onClick={() => setActiveTab("cvs")}
            className={`tab flex-1 ${activeTab === "cvs" ? "tab-active bg-primary text-primary-content" : ""}`}
          >
            Submitted CVs ({cvs.length})
          </button>
        )}
      </div>

      {activeTab === "details" && (
        <div className="flex flex-col gap-6">
          <div className="border border-base-300 p-6 rounded-lg bg-base-200 flex flex-col gap-4">
            <h3 className="text-lg font-bold border-b border-base-300 pb-2 text-primary">
              Rules & Requirements
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold block">
                  Maximum Projects Allowed:
                </span>
                <span className="text-gray-500">
                  {position.maxProjects} project(s)
                </span>
              </div>
              <div>
                <span className="font-semibold block">
                  Allowed Project Technology Tags:
                </span>
                <span className="text-gray-500">
                  {position.projectTags.join(", ") ||
                    "No technology restrictions (Any)"}
                </span>
              </div>
              {position.isPublic ? (
                <div className="col-span-1 md:col-span-2 pt-2 border-t border-base-300">
                  <span className="font-semibold block">Access Mode:</span>
                  <span className="text-success font-semibold text-xs">Public Access (Open to all candidates)</span>
                </div>
              ) : (
                <div className="col-span-1 md:col-span-2 pt-2 border-t border-base-300 flex flex-col gap-2">
                  <span className="font-semibold block">Access Filter Rules (Requirements):</span>
                  {position.accessRules && position.accessRules.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {position.accessRules.map((rule) => (
                        <span
                          key={rule.id}
                          className="bg-base-300 text-base-content text-[11px] px-2.5 py-1 rounded font-medium border-none"
                        >
                          {rule.attribute?.name} {rule.operator.replace("_", " ")} {rule.value}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-500 text-xs italic">No specific rules defined (Restricted to creator/admins)</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="border border-base-300 p-6 rounded-lg bg-base-200 flex flex-col gap-4">
            <h3 className="text-lg font-bold border-b border-base-300 pb-2 text-primary">
              Required Attributes Template
            </h3>
            {position.positionAttributes?.length === 0 ? (
              <p className="text-sm text-gray-500">
                No template attributes defined for this position.
              </p>
            ) : (
              <div className="overflow-x-auto border border-base-300 rounded-md">
                <table className="table w-full bg-base-100 text-sm">
                  <thead>
                    <tr className="bg-base-300">
                      <th>Order</th>
                      <th>Category</th>
                      <th>Attribute Name</th>
                      <th>Data Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {position.positionAttributes.map((pa) => (
                      <tr key={pa.id} className="hover:bg-base-200">
                        <td>{pa.order}</td>
                        <td>{pa.attribute.category}</td>
                        <td className="font-semibold">{pa.attribute.name}</td>
                        <td>{pa.attribute.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "discussion" && user && (
        <div className="border border-base-300 p-6 rounded-lg bg-base-200 flex flex-col gap-4 h-[600px]">
          <h3 className="text-lg font-bold border-b border-base-300 pb-2 text-primary">
            Discussion Feed
          </h3>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3"
          >
            {posts.length === 0 ? (
              <p className="text-sm text-gray-500 italic text-center py-8">
                No discussions started yet. Be the first to comment!
              </p>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  className="p-3 border border-base-300 rounded-md bg-base-100 flex flex-col gap-1.5 shadow-sm"
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-primary">
                      {post.user.name} ({post.user.role})
                    </span>
                    <span className="text-gray-400">
                      {formatDate(post.createdAt)}
                    </span>
                  </div>
                  <div
                    dangerouslySetInnerHTML={renderMarkdown(post.content)}
                    className="text-sm prose prose-sm text-base-content max-w-none"
                  />
                </div>
              ))
            )}
          </div>

          <form
            onSubmit={handleSendComment}
            className="flex gap-2 border-t border-base-300 pt-4 items-end"
          >
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="textarea textarea-bordered flex-1 text-sm h-20"
              placeholder="Write a message (Markdown format supported)..."
              required
            />
            <button
              type="submit"
              disabled={submittingComment}
              className="btn btn-primary h-20 px-6"
            >
              Post
            </button>
          </form>
        </div>
      )}

      {activeTab === "cvs" && user && isRecruiterOrAdmin && (
        <div className="border border-base-300 p-6 rounded-lg bg-base-200 flex flex-col gap-4">
          <div className="flex items-center gap-3 p-3 bg-base-100 border border-base-300 rounded-md mb-2 justify-between">
            <div className="text-sm font-semibold">
              Selected:{" "}
              <span className="text-primary">{selectedCVIds.length}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportCVsToCSV}
                className="btn btn-sm btn-success text-white"
              >
                Export to CSV
              </button>
              <button
                onClick={handleOpenSelectedCV}
                disabled={selectedCVIds.length !== 1}
                className="btn btn-sm btn-neutral"
              >
                Open
              </button>
              <button
                onClick={handleDeleteSelectedCVs}
                disabled={selectedCVIds.length === 0}
                className="btn btn-sm btn-error"
              >
                Delete
              </button>
            </div>
          </div>

          {loadingCVs ? (
            <div className="text-center py-6">Loading submissions...</div>
          ) : cvs.length === 0 ? (
            <p className="text-sm text-gray-500 italic text-center py-6">
              No candidates have submitted CVs to this position yet.
            </p>
          ) : (
            <div className="overflow-x-auto border border-base-300 rounded-md">
              <table className="table w-full bg-base-100 text-sm">
                <thead>
                  <tr className="bg-base-300">
                    <th className="w-12 text-center">
                      <input
                        type="checkbox"
                        checked={
                          selectedCVIds.length === cvs.length && cvs.length > 0
                        }
                        onChange={handleSelectAllCVs}
                        className="checkbox checkbox-sm"
                      />
                    </th>
                    <th>CV Name</th>
                    <th>Candidate Name</th>
                    <th>Email</th>
                    <th>Likes</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {cvs.map((c) => (
                    <tr key={c.id} className="hover:bg-base-200">
                      <td className="text-center">
                        <input
                          type="checkbox"
                          checked={selectedCVIds.includes(c.id)}
                          onChange={() => handleSelectCV(c.id)}
                          className="checkbox checkbox-sm"
                        />
                      </td>
                      <td
                        onClick={() => navigate(`/dashboard/cvs/${c.id}`)}
                        className="font-bold text-primary hover:underline cursor-pointer"
                      >
                        {c.name}
                      </td>
                      <td>{c.candidate.name}</td>
                      <td>{c.candidate.email}</td>
                      <td>{c._count?.likes || 0}</td>
                      <td>{formatDate(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PositionDetail;
