import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import toast from "react-hot-toast";
import Loading from "../../components/Loading";
import useAuth from "../../hooks/useAuth";
import { marked } from "marked";
import html2pdf from "html2pdf.js";

const CVDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [cv, setCv] = useState(null);
  const [attributeValues, setAttributeValues] = useState([]);
  const [candidateProjects, setCandidateProjects] = useState([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState({});

  const isCandidateOwner = cv && user && cv.candidateId === user.id;
  const canEditCV = isCandidateOwner || (user && user.role === "ADMIN");

  useEffect(() => {
    const loadCVData = async () => {
      try {
        const res = await api.get(`/api/cvs/${id}`);
        if (res.data.success) {
          const cvData = res.data.data.cv;
          setCv(cvData);
          setAttributeValues(res.data.data.attributeValues || []);
          setSelectedProjectIds(
            cvData.projects ? cvData.projects.map((p) => p.id) : [],
          );

          const projectsRes = await api.get("/api/profile");
          if (projectsRes.data.success) {
            setCandidateProjects(projectsRes.data.data.projects || []);
          }
        }
      } catch (err) {
        console.error("Load CV error:", err);
        toast.error("Failed to load CV profile");
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    loadCVData();
  }, [id, navigate]);

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

        setCv((prev) => ({ ...prev, version: currentCVVersion }));
        setCv((prev) => {
          if (prev && prev.candidate) {
            return {
              ...prev,
              candidate: { ...prev.candidate, version: currentUserVersion },
            };
          }
          return prev;
        });
        setUnsavedChanges({});
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
  }, [unsavedChanges, cv, id]);

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

  if (loading) {
    return (
      <div className="text-center p-8">
        <Loading />
        <span className="block mt-2">Loading CV profile details...</span>
      </div>
    );
  }

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
      return <span className="text-sm">{value}</span>;
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
            className={`select select-bordered w-full ${isEmpty ? "border-red-500 bg-red-50/5 text-red-500" : ""}`}
          >
            <option value="">-- Select {name} --</option>
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
            className={`input input-bordered w-full ${isEmpty ? "border-red-500 bg-red-50/5 text-red-500" : ""}`}
            placeholder={`Enter ${name}`}
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
            className={`input input-bordered w-full ${isEmpty ? "border-red-500 bg-red-50/5 text-red-500" : ""}`}
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
              className={`input input-bordered flex-1 ${isEmpty ? "border-red-500 bg-red-50/5 text-red-500" : ""}`}
            />
            <span className="self-center">to</span>
            <input
              type="date"
              value={end || ""}
              onChange={(e) =>
                handleInputChange(
                  attr.attributeId,
                  `${start || ""} to ${e.target.value}`,
                )
              }
              className={`input input-bordered flex-1 ${isEmpty ? "border-red-500 bg-red-50/5 text-red-500" : ""}`}
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
            className={`textarea textarea-bordered w-full h-24 ${isEmpty ? "border-red-500 bg-red-50/5 text-red-500" : ""}`}
            placeholder={`Markdown description for ${name}`}
          />
        );
      case "IMAGE":
        return (
          <div className="flex flex-col gap-2 w-full">
            {value && (
              <img
                src={value}
                alt={name}
                className="w-32 h-32 object-cover border border-base-300 rounded"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                try {
                  const apiKey = import.meta.env.VITE_imgbb_key;
                  const formData = new FormData();
                  formData.append("image", file);
                  const response = await fetch(
                    `https://api.imgbb.com/1/upload?key=${apiKey}`,
                    { method: "POST", body: formData },
                  );
                  const data = await response.json();
                  if (data.success) {
                    handleInputChange(attr.attributeId, data.data.url);
                    toast.success("CV image updated!");
                  }
                } catch (err) {
                  console.error(err);
                  toast.error("Image upload failed");
                }
              }}
              className={`file-input file-input-bordered file-input-sm w-full ${isEmpty ? "file-input-error" : ""}`}
            />
          </div>
        );
      case "STRING":
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) =>
              handleInputChange(attr.attributeId, e.target.value)
            }
            className={`input input-bordered w-full ${isEmpty ? "border-red-500 bg-red-50/5 text-red-500" : ""}`}
            placeholder={`Enter ${name}`}
          />
        );
    }
  };

  const renderMarkdown = (text) => {
    return { __html: marked.parse(text || "") };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    });
  };

  return (
    <div className="p-4 font-sans bg-base-100 text-base-content min-h-screen max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex justify-between items-center border-b border-base-300 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-primary">{cv.name}</h2>
          <p className="text-xs text-gray-500">
            Template: {cv.position.title} | Status:{" "}
            <span className="font-bold">{cv.status}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {canEditCV && (
            <button
              onClick={handlePublishToggle}
              disabled={!allAttributesFilled}
              className={`btn btn-sm ${cv.isPublished ? "btn-warning" : "btn-success text-white"}`}
            >
              {cv.isPublished ? "Unpublish (Draft)" : "Publish CV"}
            </button>
          )}
          <button onClick={downloadPDF} className="btn btn-sm btn-primary">
            Download PDF
          </button>
        </div>
      </div>

      {!allAttributesFilled && canEditCV && (
        <div className="p-3 bg-red-100 border-l-4 border-red-500 text-red-700 text-sm">
          Please fill out all red-bordered required template attributes to
          enable the **Publish** action.
        </div>
      )}

      {saving && (
        <span className="text-xs text-primary flex items-center gap-1 self-end">
          <span className="loading loading-spinner loading-xs"></span>
          Auto-saving changes...
        </span>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="p-8 border border-base-300 rounded-lg bg-base-200 shadow-md flex flex-col gap-6">
            <div className="flex justify-between items-start border-b border-base-300 pb-4">
              <div>
                <h3 className="text-xl font-bold">
                  {cv.candidate.name || "Candidate Name"}
                </h3>
                <p className="text-sm text-gray-500">{cv.candidate.email}</p>
                <p className="text-xs font-semibold text-primary block mt-1">
                  Position: {cv.position.title}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${window.location.href}`}
                  alt="QR Code"
                  className="w-16 h-16 border border-base-300 p-0.5 bg-white"
                />
                <span className="text-[9px] text-gray-500">
                  Scan to Verify CV
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h4 className="font-bold border-b border-base-300 pb-1 text-sm text-primary">
                Required Attributes
              </h4>
              {attributeValues.map((attr) => (
                <div key={attr.attributeId} className="flex flex-col gap-1">
                  <label className="text-sm font-semibold">
                    {attr.attribute.name}
                  </label>
                  {renderInputField(attr)}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4 mt-2">
              <h4 className="font-bold border-b border-base-300 pb-1 text-sm text-primary">
                Selected Project Details
              </h4>
              {cv.projects && cv.projects.length > 0 ? (
                cv.projects.map((p) => (
                  <div
                    key={p.id}
                    className="border border-base-300 p-3 rounded bg-base-100 flex flex-col gap-2"
                  >
                    <div className="flex justify-between">
                      <span className="font-bold text-sm">{p.name}</span>
                      <span className="text-xs text-gray-400">
                        {formatDate(p.startDate)} -{" "}
                        {p.endDate ? formatDate(p.endDate) : "Present"}
                      </span>
                    </div>
                    <div
                      dangerouslySetInnerHTML={renderMarkdown(p.description)}
                      className="text-xs prose prose-sm max-w-none text-base-content"
                    />
                    {p.tags && p.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {p.tags.map((tag) => (
                          <span
                            key={tag}
                            className="badge badge-outline badge-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 italic">
                  No projects selected for this CV.
                </p>
              )}
            </div>
          </div>
        </div>

        {canEditCV && (
          <div className="flex flex-col gap-6">
            <div className="border border-base-300 p-4 rounded-lg bg-base-200 flex flex-col gap-3">
              <h3 className="font-bold border-b border-base-300 pb-2 text-sm">
                Select CV Projects
              </h3>
              <p className="text-xs text-gray-500">
                Check up to {cv.position.maxProjects} projects matching tags:{" "}
                <span className="font-semibold">
                  {cv.position.projectTags.join(", ") || "Any"}
                </span>
              </p>

              <div className="flex flex-col gap-2 max-h-96 overflow-y-auto mt-2">
                {candidateProjects
                  .filter((p) => {
                    if (cv.position.projectTags.length === 0) return true;
                    return p.tags.some((t) =>
                      cv.position.projectTags.some(
                        (pt) => pt.toLowerCase() === t.toLowerCase(),
                      ),
                    );
                  })
                  .map((p) => {
                    const isChecked = selectedProjectIds.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        className="flex items-start gap-3 p-2 border border-base-300 rounded bg-base-100 hover:bg-base-300 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            handleProjectCheckboxChange(p.id, e.target.checked)
                          }
                          className="checkbox checkbox-xs mt-0.5"
                        />
                        <div>
                          <span className="font-semibold block">{p.name}</span>
                          <span className="text-[10px] text-gray-400">
                            Tags: {p.tags.join(", ")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                {candidateProjects.filter((p) => {
                  if (cv.position.projectTags.length === 0) return true;
                  return p.tags.some((t) =>
                    cv.position.projectTags.some(
                      (pt) => pt.toLowerCase() === t.toLowerCase(),
                    ),
                  );
                }).length === 0 && (
                  <p className="text-xs text-gray-500 italic py-2">
                    No profile projects match technology tags.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          left: "-9999px",
          top: "0",
          zIndex: "-99",
        }}
      >
        <div
          id="cv-pdf-content"
          style={{
            width: "800px",
            padding: "40px",
            fontFamily: "sans-serif",
            backgroundColor: "#ffffff",
            color: "#111827",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              borderBottom: "2px solid #e5e7eb",
              paddingBottom: "16px",
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  margin: "0 0 4px 0",
                  color: "#111827",
                }}
              >
                {cv.candidate.name || "Candidate Name"}
              </h3>
              <p style={{ margin: "0", fontSize: "14px", color: "#4b5563" }}>
                {cv.candidate.email}
              </p>
              <p
                style={{
                  margin: "4px 0 0 0",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#2563eb",
                }}
              >
                Position: {cv.position.title}
              </p>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "end",
                gap: "4px",
              }}
            >
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${window.location.href}`}
                alt="QR Code"
                style={{
                  width: "64px",
                  height: "64px",
                  border: "1px solid #d1d5db",
                  padding: "2px",
                  backgroundColor: "#ffffff",
                }}
              />
              <span style={{ fontSize: "8px", color: "#6b7280" }}>
                Scan to Verify CV
              </span>
            </div>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <h4
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                borderBottom: "1px solid #e5e7eb",
                paddingBottom: "4px",
                margin: "0",
                color: "#2563eb",
              }}
            >
              Required Attributes
            </h4>
            {attributeValues.map((attr) => {
              const value = attr.value;
              const isEmpty = value.trim() === "";
              return (
                <div
                  key={attr.attributeId}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    {attr.attribute.name}
                  </span>
                  <div style={{ fontSize: "14px", color: "#111827" }}>
                    {isEmpty ? (
                      <span
                        style={{
                          color: "#ef4444",
                          fontWeight: "bold",
                          fontStyle: "italic",
                        }}
                      >
                        Empty Value
                      </span>
                    ) : attr.attribute.type === "IMAGE" ? (
                      <img
                        src={value}
                        alt={attr.attribute.name}
                        style={{
                          width: "120px",
                          height: "120px",
                          objectFit: "cover",
                          borderRadius: "4px",
                          border: "1px solid #d1d5db",
                        }}
                      />
                    ) : attr.attribute.type === "BOOLEAN" ? (
                      <span>{value === "true" ? "Yes" : "No"}</span>
                    ) : (
                      <span>{value}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <h4
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                borderBottom: "1px solid #e5e7eb",
                paddingBottom: "4px",
                margin: "0",
                color: "#2563eb",
              }}
            >
              Selected Projects
            </h4>
            {cv.projects && cv.projects.length > 0 ? (
              cv.projects.map((p) => (
                <div
                  key={p.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    padding: "12px",
                    borderRadius: "6px",
                    backgroundColor: "#f9fafb",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: "bold",
                        color: "#111827",
                      }}
                    >
                      {p.name}
                    </span>
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>
                      {formatDate(p.startDate)} -{" "}
                      {p.endDate ? formatDate(p.endDate) : "Present"}
                    </span>
                  </div>
                  <div
                    dangerouslySetInnerHTML={renderMarkdown(p.description)}
                    style={{ fontSize: "13px", color: "#374151" }}
                  />
                  {p.tags && p.tags.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px",
                        marginTop: "4px",
                      }}
                    >
                      {p.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: "10px",
                            padding: "2px 6px",
                            border: "1px solid #d1d5db",
                            borderRadius: "4px",
                            backgroundColor: "#ffffff",
                            color: "#4b5563",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  fontStyle: "italic",
                  margin: "0",
                }}
              >
                No projects selected for this CV.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CVDetail;
