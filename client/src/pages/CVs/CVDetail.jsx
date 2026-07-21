import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../utils/api";
import toast from "react-hot-toast";
import Loading from "../../components/Loading";
import useAuth from "../../hooks/useAuth";
import { marked } from "marked";
import html2pdf from "html2pdf.js";
import useTitle from "../../hooks/useTitle";

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const CVDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const isCandidateOrAdmin =
    user && (user.role === "CANDIDATE" || user.role === "ADMIN");

  const { data: cvData, isLoading: isLoadingCV } = useQuery({
    queryKey: ["cv", id],
    queryFn: async () => {
      const res = await api.get(`/api/cvs/${id}`);
      return res.data.success ? res.data.data : null;
    },
  });

  const cv = cvData?.cv;
  useTitle(cv ? `${cv.name} - CV` : "CV Details");

  const { data: profileData } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await api.get("/api/profile");
      return res.data.success ? res.data.data : null;
    },
    enabled: !!user && isCandidateOrAdmin,
  });

  const candidateProjects = profileData?.projects || [];

  if (isLoadingCV) {
    return (
      <div className="text-center p-8">
        <Loading />
        <span className="block mt-2">Loading CV profile details...</span>
      </div>
    );
  }

  if (!cvData) {
    return (
      <div className="text-center p-8 text-error">CV profile not found.</div>
    );
  }

  return (
    <CVDetailInner
      cvData={cvData}
      candidateProjects={candidateProjects}
      key={cvData.cv.id}
    />
  );
};

const CVDetailInner = ({ cvData, candidateProjects }) => {
  const { id } = useParams();
  const { user } = useAuth();

  const queryClient = useQueryClient();

  const [cv, setCv] = useState(cvData.cv);
  const [attributeValues, setAttributeValues] = useState(
    cvData.attributeValues || [],
  );
  const [selectedProjectIds, setSelectedProjectIds] = useState(
    cvData.cv.projects ? cvData.cv.projects.map((p) => p.id) : [],
  );
  const [saving, setSaving] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState({});
  const [isLiked, setIsLiked] = useState(
    cvData.cv.likes
      ? cvData.cv.likes.some((l) => l.userId === user?.id)
      : false,
  );
  const [likesCount, setLikesCount] = useState(
    cvData.cv.likes ? cvData.cv.likes.length : 0,
  );

  const isCandidateOwner = cv && user && cv.candidateId === user.id;
  const canEditCV = isCandidateOwner || (user && user.role === "ADMIN");
  const isRecruiterOrAdmin =
    user && (user.role === "RECRUITER" || user.role === "ADMIN");

  useEffect(() => {
    if (Object.keys(unsavedChanges).length === 0) return;

    const autoSaveTimer = setTimeout(async () => {
      setSaving(true);
      try {
        let currentCVVersion = cv.version;
        let currentUserVersion = cv.candidate.version;

        for (const [attrId, val] of Object.entries(unsavedChanges)) {
          const res = await api.post(`/api/cvs/${id}/attribute`, {
            attributeId: attrId,
            value: val,
            cvVersion: currentCVVersion,
            userVersion: currentUserVersion,
          });
          if (res.data.success) {
            currentCVVersion = res.data.newCVVersion;
            currentUserVersion = res.data.newUserVersion;
          }
        }

        setCv((prev) => ({
          ...prev,
          version: currentCVVersion,
          candidate: { ...prev.candidate, version: currentUserVersion },
        }));
        setUnsavedChanges({});
        queryClient.invalidateQueries({ queryKey: ["cv", id] });
        toast.success("CV attribute auto-saved!");
      } catch (err) {
        console.error("Auto save failed:", err);
        if (err.response?.status === 409) {
          toast.error(
            "Version conflict: CV or Profile has been modified elsewhere. Please refresh.",
          );
        } else {
          toast.error("Failed to auto-save CV changes");
        }
      } finally {
        setSaving(false);
      }
    }, 5000);

    return () => clearTimeout(autoSaveTimer);
  }, [unsavedChanges, cv, id, queryClient]);

  const handleInputChange = (attrId, val) => {
    setAttributeValues((prev) =>
      prev.map((attr) =>
        attr.attributeId === attrId ? { ...attr, value: val } : attr,
      ),
    );
    setUnsavedChanges((prev) => ({
      ...prev,
      [attrId]: val,
    }));
  };

  const handleProjectCheckboxChange = async (projId, isChecked) => {
    let updatedIds = [...selectedProjectIds];
    if (isChecked) {
      if (updatedIds.length >= cv.position.maxProjects) {
        toast.error(`Maximum projects allowed is ${cv.position.maxProjects}`);
        return;
      }
      updatedIds.push(projId);
    } else {
      updatedIds = updatedIds.filter((pid) => pid !== projId);
    }

    try {
      const res = await api.put(`/api/cvs/${id}`, {
        projectIds: updatedIds,
        version: cv.version,
      });

      if (res.data.success) {
        setSelectedProjectIds(updatedIds);
        setCv((prev) => ({
          ...prev,
          version: res.data.newVersion,
          projects: prev.projects
            ? isChecked
              ? [
                  ...prev.projects,
                  candidateProjects.find((p) => p.id === projId),
                ]
              : prev.projects.filter((p) => p.id !== projId)
            : [],
        }));
        queryClient.invalidateQueries({ queryKey: ["cv", id] });
        toast.success("Projects list updated!");
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 409) {
        toast.error("Version conflict. Please refresh.");
      } else {
        toast.error("Failed to update projects");
      }
    }
  };

  const handlePublishToggle = async () => {
    const isCurrentlyPublished = cv.isPublished;
    const nextPublishedState = !isCurrentlyPublished;
    const nextStatus = nextPublishedState ? "Active" : "Inactive";

    try {
      const res = await api.put(`/api/cvs/${id}`, {
        isPublished: nextPublishedState,
        status: nextStatus,
        version: cv.version,
      });

      if (res.data.success) {
        setCv((prev) => ({
          ...prev,
          isPublished: nextPublishedState,
          status: nextStatus,
          version: res.data.newVersion,
        }));
        queryClient.invalidateQueries({ queryKey: ["cv", id] });
        queryClient.invalidateQueries({ queryKey: ["my-cvs"] });
        toast.success(
          nextPublishedState
            ? "CV Published! Recruiters can now search and view this CV."
            : "CV Unpublished to Draft status.",
        );
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 409) {
        toast.error("Version conflict. Please refresh.");
      } else {
        toast.error("Failed to update publish state");
      }
    }
  };

  const downloadPDF = () => {
    const element = document.getElementById("cv-pdf-content");
    if (!element) return;

    const clone = element.cloneNode(true);
    clone.style.position = "static";
    clone.style.left = "auto";
    clone.style.top = "auto";

    document.body.appendChild(clone);

    const origBodyBg = document.body.style.backgroundColor;
    const origHtmlBg = document.documentElement.style.backgroundColor;
    const origBodyColor = document.body.style.color;
    const origHtmlColor = document.documentElement.style.color;

    document.body.style.backgroundColor = "#ffffff";
    document.documentElement.style.backgroundColor = "#ffffff";
    document.body.style.color = "#111827";
    document.documentElement.style.color = "#111827";

    const opt = {
      margin: 0.5,
      filename: `${cv.name.replace(/\s+/g, "_")}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    };

    html2pdf()
      .set(opt)
      .from(clone)
      .save()
      .then(() => {
        document.body.removeChild(clone);
        document.body.style.backgroundColor = origBodyBg;
        document.documentElement.style.backgroundColor = origHtmlBg;
        document.body.style.color = origBodyColor;
        document.documentElement.style.color = origHtmlColor;
      })
      .catch((err) => {
        console.error("PDF generation failed:", err);
        if (document.body.contains(clone)) {
          document.body.removeChild(clone);
        }
        document.body.style.backgroundColor = origBodyBg;
        document.documentElement.style.backgroundColor = origHtmlBg;
        document.body.style.color = origBodyColor;
        document.documentElement.style.color = origHtmlColor;
      });
  };

  const handleLikeToggle = async () => {
    try {
      const res = await api.post(`/api/cvs/${id}/like`);
      if (res.data.success) {
        setIsLiked(res.data.liked);
        setLikesCount((prev) => (res.data.liked ? prev + 1 : prev - 1));
        queryClient.invalidateQueries({ queryKey: ["cv", id] });
        toast.success(res.data.message);
      }
    } catch (err) {
      console.error("Like error:", err);
      toast.error("Failed to toggle like on this CV");
    }
  };

  const allAttributesFilled = attributeValues.every(
    (attr) => attr.value.trim() !== "",
  );

  const renderInputField = (attr) => {
    const { type, name, options } = attr.attribute;
    const value = attr.value;
    const isEmpty = value.trim() === "";

    if (!canEditCV) {
      if (isEmpty) {
        return (
          <span className="text-red-500 font-semibold italic text-sm">
            Empty Value
          </span>
        );
      }
      if (type === "BOOLEAN") {
        return (
          <span className="text-sm font-semibold">
            {value === "true" ? "Yes" : "No"}
          </span>
        );
      }
      if (type === "IMAGE") {
        return (
          <img
            src={value}
            alt={name}
            className="w-32 h-32 object-cover border border-base-300 rounded"
          />
        );
      }
      return (
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {value}
        </div>
      );
    }

    switch (type) {
      case "BOOLEAN":
        return (
          <input
            type="checkbox"
            checked={value === "true"}
            onChange={(e) =>
              handleInputChange(attr.attributeId, String(e.target.checked))
            }
            className="checkbox checkbox-md"
          />
        );
      case "DROPDOWN":
        return (
          <select
            value={value}
            onChange={(e) =>
              handleInputChange(attr.attributeId, e.target.value)
            }
            className="select select-bordered w-full select-sm font-sans"
          >
            <option value="">-- Choose {name} --</option>
            {options.map((opt) => (
              <option key={opt.id} value={opt.value}>
                {opt.value}
              </option>
            ))}
          </select>
        );
      case "NUMERIC":
        return (
          <input
            type="number"
            value={value}
            onChange={(e) =>
              handleInputChange(attr.attributeId, e.target.value)
            }
            className="input input-bordered w-full input-sm"
            placeholder={`Enter numeric ${name}`}
          />
        );
      case "DATE":
        return (
          <input
            type="date"
            value={value}
            onChange={(e) =>
              handleInputChange(attr.attributeId, e.target.value)
            }
            className="input input-bordered w-full input-sm"
          />
        );
      case "PERIOD": {
        const [start, end] = value.split(" to ");
        return (
          <div className="flex gap-2 w-full">
            <input
              type="date"
              value={start || ""}
              onChange={(e) =>
                handleInputChange(
                  attr.attributeId,
                  `${e.target.value} to ${end || ""}`,
                )
              }
              className="input input-bordered flex-1 input-sm"
            />
            <span className="self-center text-xs">to</span>
            <input
              type="date"
              value={end || ""}
              onChange={(e) =>
                handleInputChange(
                  attr.attributeId,
                  `${start || ""} to ${e.target.value}`,
                )
              }
              className="input input-bordered flex-1 input-sm"
            />
          </div>
        );
      }
      case "TEXT":
        return (
          <textarea
            value={value}
            onChange={(e) =>
              handleInputChange(attr.attributeId, e.target.value)
            }
            className="textarea textarea-bordered w-full h-24 text-sm"
            placeholder={`Markdown text for ${name}`}
          />
        );
      case "IMAGE":
        return (
          <div className="text-xs text-gray-500 py-1">
            {value && (
              <img
                src={value}
                alt={name}
                className="w-24 h-24 object-cover border border-base-300 rounded mb-2"
              />
            )}
            <span className="block italic">
              Upload profile image from profile edit page
            </span>
          </div>
        );
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) =>
              handleInputChange(attr.attributeId, e.target.value)
            }
            className="input input-bordered w-full input-sm"
            placeholder={`Enter ${name}`}
          />
        );
    }
  };

  const renderMarkdown = (text) => {
    return { __html: marked.parse(text || "") };
  };

  return (
    <div className="p-4 font-sans bg-base-100 text-base-content min-h-screen max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-base-300 pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span>{cv.name}</span>
            <span
              className={`badge ${cv.isPublished ? "badge-success" : "badge-warning"} badge-sm`}
            >
              {cv.isPublished ? "Published" : "Draft"}
            </span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Applied Position: {cv.position?.title}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {saving && (
            <span className="badge badge-primary py-3 text-xs">
              Auto-saving...
            </span>
          )}

          <button onClick={downloadPDF} className="btn btn-xs btn-neutral">
            Download PDF
          </button>

          {user && isRecruiterOrAdmin && (
            <button
              onClick={handleLikeToggle}
              className={`btn btn-xs ${isLiked ? "btn-primary" : "btn-outline btn-neutral"}`}
            >
              {isLiked ? "❤️ Liked" : "🤍 Like"} ({likesCount})
            </button>
          )}

          {canEditCV && (
            <button
              onClick={handlePublishToggle}
              disabled={!allAttributesFilled}
              className={`btn btn-xs ${cv.isPublished ? "btn-warning" : "btn-success text-white"}`}
              title={
                !allAttributesFilled ? "Fill all attributes to publish" : ""
              }
            >
              {cv.isPublished ? "Unpublish to Draft" : "Publish CV"}
            </button>
          )}
        </div>
      </div>

      <div
        id="cv-pdf-content"
        className="bg-base-100 p-6 border border-base-300 rounded-lg shadow-sm flex flex-col gap-6"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-base-300 pb-4 gap-4">
          <div className="flex items-center gap-3">
            {cv.candidate.userAttributes?.find(
              (a) => a.attribute.name === "Personal Photo",
            )?.value ? (
              <img
                src={
                  cv.candidate.userAttributes.find(
                    (a) => a.attribute.name === "Personal Photo",
                  ).value
                }
                alt={cv.candidate.name}
                className="w-16 h-16 rounded-full object-cover border border-primary p-0.5"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold text-xl">
                {cv.candidate.name ? cv.candidate.name[0].toUpperCase() : "U"}
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-primary">
                {cv.candidate.name}
              </h3>
              <p className="text-xs text-gray-500">{cv.candidate.email}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {attributeValues.map((attr) => (
            <div
              key={attr.id}
              className="p-3 border border-base-300 rounded-md bg-base-200/50 flex flex-col gap-1"
            >
              <span className="text-[10px] font-bold text-gray-400 uppercase">
                {attr.attribute.category} | {attr.attribute.name}
              </span>
              {renderInputField(attr)}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 border-t border-base-300 pt-6">
          <h3 className="text-md font-bold text-primary">Selected Projects</h3>

          {cv.projects?.length === 0 ? (
            <p className="text-xs text-gray-400 italic">
              No projects linked to this CV.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {cv.projects.map((proj) => (
                <div
                  key={proj.id}
                  className="p-3 border border-base-300 rounded bg-base-200/35"
                >
                  <div className="flex justify-between items-start text-xs mb-1">
                    <strong className="text-sm font-semibold">
                      {proj.name}
                    </strong>
                    <span className="text-gray-500">
                      {formatDate(proj.startDate)} -{" "}
                      {proj.endDate ? formatDate(proj.endDate) : "Present"}
                    </span>
                  </div>
                  <div
                    dangerouslySetInnerHTML={renderMarkdown(proj.description)}
                    className="text-xs prose prose-sm text-base-content max-w-none mb-1.5"
                  />
                  {proj.tags && proj.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {proj.tags.map((t) => (
                        <span key={t} className="badge badge-outline badge-xs">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {canEditCV && candidateProjects.length > 0 && (
        <div className="border border-base-300 p-6 rounded-lg bg-base-200 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-primary">
            Link Projects to CV (Max: {cv.position.maxProjects})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {candidateProjects.map((p) => {
              const isChecked = selectedProjectIds.includes(p.id);
              return (
                <label
                  key={p.id}
                  className="flex items-center gap-3 p-3 bg-base-100 border border-base-300 rounded hover:bg-base-300 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) =>
                      handleProjectCheckboxChange(p.id, e.target.checked)
                    }
                    className="checkbox checkbox-xs"
                  />
                  <div>
                    <span className="font-bold block">{p.name}</span>
                    <span className="text-gray-400">
                      Tags:{" "}
                      {p.tags && p.tags.length > 0 ? p.tags.join(", ") : "None"}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CVDetail;
