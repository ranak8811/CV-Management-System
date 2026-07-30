import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "../utils/api";
import toast from "react-hot-toast";

const SalesforceSyncModal = ({ isOpen, onClose }) => {
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("Software Engineer");
  const [industry, setIndustry] = useState("Technology");

  const syncMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/api/salesforce/sync", payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(
        `Synced to Salesforce! Account ID: ${data.data.salesforceAccountId}`,
      );
      onClose();
    },
    onError: (err) => {
      console.error("Salesforce Sync Error:", err);
      toast.error(
        err.response?.data?.message || "Failed to sync with Salesforce CRM",
      );
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!companyName.trim() || !phone.trim()) {
      return toast.error("Company Name and Phone Number are required!");
    }

    syncMutation.mutate({
      companyName: companyName.trim(),
      phone: phone.trim(),
      jobTitle: jobTitle.trim(),
      industry,
    });
  };

  return (
    <div className="modal modal-open z-50">
      <div className="modal-box relative max-w-md bg-base-100 text-base-content">
        <button
          onClick={onClose}
          type="button"
          className="btn btn-sm btn-circle absolute right-2 top-2"
        >
          ✕
        </button>
        <h3 className="font-bold text-base text-primary flex items-center gap-2">
          <span>☁️</span> Sync Profile to Salesforce CRM
        </h3>
        <p className="text-xs text-gray-400 mt-0.5 mb-4">
          Export candidate metadata to Salesforce CRM as a linked Account &
          Contact.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs">
          <div>
            <label className="font-semibold block mb-1">
              Company / Org Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Google Inc or Freelance"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="input input-bordered w-full input-sm"
              required
            />
          </div>

          <div>
            <label className="font-semibold block mb-1">Phone Number *</label>
            <input
              type="text"
              placeholder="e.g. +1-555-0199"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input input-bordered w-full input-sm"
              required
            />
          </div>

          <div>
            <label className="font-semibold block mb-1">Job Title</label>
            <input
              type="text"
              placeholder="e.g. Senior Software Engineer"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="input input-bordered w-full input-sm"
            />
          </div>

          <div>
            <label className="font-semibold block mb-1">Industry</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="select select-bordered w-full select-sm"
            >
              <option value="Technology">Technology</option>
              <option value="Finance">Finance</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Education">Education</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="modal-action mt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-sm btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={syncMutation.isPending}
              className="btn btn-sm btn-primary text-white"
            >
              {syncMutation.isPending ? "Syncing..." : "Sync to Salesforce"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SalesforceSyncModal;
