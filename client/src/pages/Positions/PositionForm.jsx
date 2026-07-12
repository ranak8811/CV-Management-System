import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../utils/api";
import toast from "react-hot-toast";
import Loading from "../../components/Loading";

const PositionForm = () => {
  const { id } = useParams();
  const isEditMode = !!id;

  const { data: position, isLoading: isLoadingPosition } = useQuery({
    queryKey: ["position", id],
    queryFn: async () => {
      const res = await api.get(`/api/positions/${id}`);
      return res.data.success ? res.data.data : null;
    },
    enabled: isEditMode,
  });

  if (isEditMode && isLoadingPosition) {
    return (
      <div className="text-center p-8">
        <Loading />
        <span className="block mt-2">Loading template details...</span>
      </div>
    );
  }

  return <PositionFormInner position={position} key={position?.id || "new"} />;
};

const PositionFormInner = ({ position }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = !!id;

  const [title, setTitle] = useState(position?.title || "");
  const [description, setDescription] = useState(position?.description || "");
  const [isPublic, setIsPublic] = useState(position ? position.isPublic : true);
  const [maxProjects, setMaxProjects] = useState(
    position ? position.maxProjects : 3,
  );
  const [projectTags, setProjectTags] = useState(position?.projectTags || []);
  const [tagInput, setTagInput] = useState("");
  const [version] = useState(position?.version || 1);

  const [selectedAttrs, setSelectedAttrs] = useState(
    position
      ? position.positionAttributes.map((pa) => ({
          attributeId: pa.attributeId,
          order: pa.order,
        }))
      : [],
  );
  const [accessRules, setAccessRules] = useState(
    position
      ? position.accessRules.map((ar) => ({
          attributeId: ar.attributeId,
          operator: ar.operator,
          value: ar.value,
        }))
      : [],
  );
  const [ruleAttributeId, setRuleAttributeId] = useState("");
  const [ruleOperator, setRuleOperator] = useState("EQUALS");
  const [ruleValue, setRuleValue] = useState("");

  const operators = [
    "EQUALS",
    "GREATER_THAN",
    "LESS_THAN",
    "CONTAINS",
    "IS_CHECKED",
  ];

  const { data: libraryAttributes = [] } = useQuery({
    queryKey: ["attributes"],
    queryFn: async () => {
      const res = await api.get("/api/attributes");
      return res.data.success ? res.data.data : [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (isEditMode) {
        return await api.put(`/api/positions/${id}`, payload);
      } else {
        return await api.post("/api/positions", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      if (isEditMode) {
        queryClient.invalidateQueries({ queryKey: ["position", id] });
      }
      toast.success(
        isEditMode
          ? "Position updated successfully!"
          : "Position created successfully!",
      );
      navigate("/dashboard/positions");
    },
    onError: (err) => {
      console.error(err);
      if (err.response?.status === 409) {
        toast.error(
          "Conflict: This position was modified by another recruiter. Please reload the page.",
        );
      } else {
        toast.error(err.response?.data?.message || "Failed to save position");
      }
    },
  });

  const handleAddTag = (e) => {
    e.preventDefault();
    const trimmed = tagInput.trim();
    if (trimmed && !projectTags.includes(trimmed)) {
      setProjectTags([...projectTags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setProjectTags(projectTags.filter((t) => t !== tagToRemove));
  };

  const handleAttributeCheckboxChange = (attrId) => {
    const exists = selectedAttrs.find((item) => item.attributeId === attrId);
    if (exists) {
      setSelectedAttrs(
        selectedAttrs.filter((item) => item.attributeId !== attrId),
      );
      setAccessRules(accessRules.filter((rule) => rule.attributeId !== attrId));
    } else {
      setSelectedAttrs([...selectedAttrs, { attributeId: attrId, order: 0 }]);
    }
  };

  const handleAttributeOrderChange = (attrId, orderVal) => {
    setSelectedAttrs(
      selectedAttrs.map((item) =>
        item.attributeId === attrId
          ? { ...item, order: Number(orderVal) }
          : item,
      ),
    );
  };

  const handleAddRule = (e) => {
    e.preventDefault();
    if (!ruleAttributeId || !ruleValue.trim()) {
      toast.error("Please select attribute and fill rule value");
      return;
    }

    const exists = accessRules.some(
      (rule) => rule.attributeId === ruleAttributeId,
    );
    if (exists) {
      toast.error("Filter rule already exists for this attribute");
      return;
    }

    const newRule = {
      attributeId: ruleAttributeId,
      operator: ruleOperator,
      value: ruleValue.trim(),
    };

    setAccessRules([...accessRules, newRule]);
    setRuleValue("");
  };

  const handleRemoveRule = (attrId) => {
    setAccessRules(accessRules.filter((rule) => rule.attributeId !== attrId));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (selectedAttrs.length === 0) {
      toast.error("Please select at least one attribute from library");
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      isPublic,
      maxProjects: Number(maxProjects),
      projectTags,
      selectedAttributes: selectedAttrs,
      accessRules: !isPublic ? accessRules : [],
      version,
    };

    saveMutation.mutate(payload);
  };

  if (saveMutation.isPending) {
    return (
      <div className="fixed inset-0 bg-base-100/85 flex items-center justify-center z-50">
        <div className="text-center flex flex-col items-center gap-3">
          <Loading />
          <span className="font-semibold text-lg text-primary">
            Saving Template...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 font-sans bg-base-100 text-base-content min-h-screen max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">
        {isEditMode ? "Edit Position Template" : "Create New Position Template"}
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold">Position Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input input-bordered w-full"
            placeholder="e.g. Senior Backend Developer"
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold">Job Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="textarea textarea-bordered w-full h-32"
            placeholder="Describe role requirements..."
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold">Max Projects in CV</label>
            <input
              type="number"
              value={maxProjects}
              onChange={(e) => setMaxProjects(e.target.value)}
              className="input input-bordered w-full"
              min="1"
              max="10"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold">
              Project Technology Tags
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                className="input input-bordered flex-1"
                placeholder="e.g. React"
              />
              <button onClick={handleAddTag} className="btn btn-primary">
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {projectTags.map((tag) => (
                <span
                  key={tag}
                  className="badge badge-neutral gap-1 p-3 rounded-full text-xs"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-red-500 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="border border-base-300 p-4 rounded-md bg-base-200">
          <h3 className="font-bold mb-3">Select Template Attributes</h3>
          <p className="text-xs text-gray-500 mb-4">
            Choose which attributes candidate must fill for this generated CV
            template and specify rendering order.
          </p>

          <div className="flex flex-col gap-3">
            {libraryAttributes.map((attr) => {
              const isSelected = selectedAttrs.some(
                (item) => item.attributeId === attr.id,
              );
              const selectedItem = selectedAttrs.find(
                (item) => item.attributeId === attr.id,
              );

              return (
                <div
                  key={attr.id}
                  className="flex items-center justify-between p-2 hover:bg-base-100 rounded"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleAttributeCheckboxChange(attr.id)}
                      className="checkbox checkbox-sm"
                    />
                    <div>
                      <span className="font-semibold text-sm">{attr.name}</span>
                      <span className="text-xs text-gray-400 block">
                        {attr.category} | {attr.type}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Order:</span>
                      <input
                        type="number"
                        value={selectedItem?.order || 0}
                        onChange={(e) =>
                          handleAttributeOrderChange(attr.id, e.target.value)
                        }
                        className="input input-bordered input-sm w-16"
                        min="0"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 border border-base-300 p-3 rounded-md">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="checkbox checkbox-md"
            id="isPublicToggle"
          />
          <label
            htmlFor="isPublicToggle"
            className="font-semibold cursor-pointer"
          >
            Make Position Public (All users can access)
          </label>
        </div>

        {!isPublic && (
          <div className="border border-base-300 p-4 rounded-md bg-base-200 flex flex-col gap-4">
            <h3 className="font-bold">Access Filter Rules</h3>
            <p className="text-xs text-gray-500">
              Only candidates whose profile attributes satisfy these filters can
              view this position and submit CVs.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
              <div>
                <label className="text-xs font-semibold block mb-1">
                  Select Attribute
                </label>
                <select
                  value={ruleAttributeId}
                  onChange={(e) => setRuleAttributeId(e.target.value)}
                  className="select select-bordered w-full select-sm"
                >
                  <option value="">-- Choose Attribute --</option>
                  {libraryAttributes
                    .filter((attr) =>
                      selectedAttrs.some(
                        (item) => item.attributeId === attr.id,
                      ),
                    )
                    .map((attr) => (
                      <option key={attr.id} value={attr.id}>
                        {attr.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">
                  Operator
                </label>
                <select
                  value={ruleOperator}
                  onChange={(e) => setRuleOperator(e.target.value)}
                  className="select select-bordered w-full select-sm"
                >
                  {operators.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">
                  Target Value
                </label>
                <input
                  type="text"
                  value={ruleValue}
                  onChange={(e) => setRuleValue(e.target.value)}
                  placeholder="e.g. 7.0 or Advanced"
                  className="input input-bordered w-full input-sm"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddRule}
              className="btn btn-sm btn-primary self-start"
            >
              + Add Filter Rule
            </button>

            <div className="mt-2 flex flex-col gap-2">
              {accessRules.map((rule) => {
                const attr = libraryAttributes.find(
                  (a) => a.id === rule.attributeId,
                );
                return (
                  <div
                    key={rule.attributeId}
                    className="flex justify-between items-center bg-base-100 p-2 rounded border border-base-300 text-sm"
                  >
                    <div>
                      <strong>{attr?.name || "Unknown"}</strong> {rule.operator}{" "}
                      <span className="badge badge-outline">{rule.value}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(rule.attributeId)}
                      className="text-red-500 font-bold hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={() => navigate("/dashboard/positions")}
            className="btn btn-neutral"
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {isEditMode ? "Update Template" : "Create Template"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PositionForm;
