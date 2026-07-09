import { useNavigate, useParams } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../utils/api";
import Loading from "../../components/Loading";

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
  const isRecruiterOrAdmin =
    user && (user.role === "RECRUITER" || user.role === "ADMIN");

  useEffect(() => {
    const loadCVData = async () => {
      try {
        const res = await api.get("/api/profile");

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
    let updatedIds = [...setSelectedProjectIds];

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
    const opt = {
      margin: 0.5,
      filename: `${cv.name.replace(/\s+/g, "_")}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    };
    html2pdf().set(opt).from(element).save();
  };

  if (loading) {
    return (
      <div className="text-center p-8">
        <Loading />
        <span className="block mt-2">Loading CV profile details...</span>
      </div>
    );
  }

  return <div></div>;
};

export default CVDetail;
