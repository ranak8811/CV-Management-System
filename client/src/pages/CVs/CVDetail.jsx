import { useNavigate, useParams } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../utils/api";

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

  return <div></div>;
};

export default CVDetail;
