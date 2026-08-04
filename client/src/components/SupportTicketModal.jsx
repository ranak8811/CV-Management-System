import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "../utils/api";
import toast from "react-hot-toast";

const SupportTicketModal = ({ isOpen, onClose, positionTitle }) => {
  const [summary, setSummary] = useState("");
  const [priority, setPriority] = useState("Average");

  const ticketMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/api/support/tickets", payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(
        `Support ticket created! JSON uploaded to OneDrive: ${data.data.fileName}`,
      );
      setSummary("");
      setPriority("Average");
      onClose();
    },
    onError: (err) => {
      console.error("Support Ticket Creation Error:", err);
      toast.error(
        err.response?.data?.message || "Failed to create support ticket",
      );
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!summary.trim()) {
      return toast.error("Please enter a ticket summary.");
    }

    ticketMutation.mutate({
      summary: summary.trim(),
      priority,
      pageUrl: window.location.href,
      positionTitle: positionTitle || "General Application",
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
          <span>🎧</span> Create Support Ticket (Power Automate)
        </h3>
        <p className="text-xs text-gray-400 mt-0.5 mb-4">
          Generate a JSON support ticket and upload it to OneDrive for automated admin email & phone notification.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs">
          <div>
            <label className="font-semibold block mb-1">
              Ticket Summary / Issue Description *
            </label>
            <textarea
              placeholder="Describe the issue or help requested..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="textarea textarea-bordered w-full h-24 text-xs"
              required
            />
          </div>

          <div>
            <label className="font-semibold block mb-1">Priority Level *</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="select select-bordered w-full select-sm"
            >
              <option value="High">🔴 High Priority</option>
              <option value="Average">🟡 Average Priority</option>
              <option value="Low">🟢 Low Priority</option>
            </select>
          </div>

          <div className="bg-base-200 p-2.5 rounded text-[11px] text-gray-500 flex flex-col gap-1">
            <div>
              <span className="font-bold">Current Page Link: </span>
              <span className="font-mono text-[10px] break-all">
                {window.location.href}
              </span>
            </div>
            {positionTitle && (
              <div>
                <span className="font-bold">Inventory / Position: </span>
                <span>{positionTitle}</span>
              </div>
            )}
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
              disabled={ticketMutation.isPending}
              className="btn btn-sm btn-primary text-white"
            >
              {ticketMutation.isPending ? "Uploading JSON..." : "Submit Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupportTicketModal;
