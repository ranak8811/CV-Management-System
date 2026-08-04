import { uploadSupportTicketToOneDrive } from "../utils/oneDriveService.js";

const createSupportTicket = async (req, res) => {
  const user = req.user;
  const { summary, priority, pageUrl, positionTitle } = req.body;

  if (!summary || !summary.trim()) {
    return res.status(400).json({
      success: false,
      message: "Ticket summary is required.",
    });
  }

  try {
    const result = await uploadSupportTicketToOneDrive({
      user,
      summary: summary.trim(),
      priority: priority || "Average",
      pageUrl: pageUrl || req.headers.referer || "http://localhost:5173",
      positionTitle: positionTitle || "General Application",
    });

    res.status(201).json({
      success: true,
      message:
        "Support ticket created and uploaded to OneDrive for Power Automate!",
      data: result,
    });
  } catch (error) {
    console.error("Support Ticket Controller Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to process support ticket",
    });
  }
};

export { createSupportTicket };
