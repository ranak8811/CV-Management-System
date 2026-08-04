import { prisma } from "../config/db.js";

export const uploadSupportTicketToOneDrive = async ({
  user,
  summary,
  priority = "Average",
  pageUrl = "http://localhost:5173",
  positionTitle = "General Application",
}) => {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { email: true },
  });

  const adminEmails = admins.map((a) => a.email);
  if (adminEmails.length === 0) {
    adminEmails.push("admin@cvsystem.com");
  }

  const ticketId = `TCK-${Date.now().toString().slice(-6)}`;
  const fileName = `ticket_${Date.now()}_${priority.toLowerCase()}.json`;

  const ticketContent = {
    ticketId,
    reportedBy: `${user.name} (${user.email})`,
    inventory: positionTitle || "General Application",
    link: pageUrl,
    priority:
      priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase(),
    summary,
    adminEmails,
    createdAt: new Date().toISOString(),
  };

  const accessToken = process.env.ONEDRIVE_ACCESS_TOKEN?.trim();

  if (!accessToken) {
    throw new Error(
      "ONEDRIVE_ACCESS_TOKEN is missing in server/.env. Please generate a token from Microsoft Graph Explorer.",
    );
  }

  // 2. Attempt uploading to /Support_Tickets_for_CV_Management_Project/ folder in OneDrive
  let graphUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/Support_Tickets_for_CV_Management_Project/${fileName}:/content`;

  let response = await fetch(graphUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(ticketContent, null, 2),
  });

  let data = await response.json();

  // If itemNotFound (folder doesn't exist yet), create Support_Tickets_for_CV_Management_Project folder automatically and retry!
  if (!response.ok && data.error?.code === "itemNotFound") {
    console.log("[OneDrive Service] 'Support_Tickets_for_CV_Management_Project' folder not found. Creating folder automatically...");

    try {
      const folderResponse = await fetch("https://graph.microsoft.com/v1.0/me/drive/root/children", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Support_Tickets_for_CV_Management_Project",
          folder: {},
          "@microsoft.graph.conflictBehavior": "skip",
        }),
      });

      if (!folderResponse.ok) {
        const folderError = await folderResponse.json();
        console.error("[OneDrive Service] Folder creation failed:", folderError);
      }

      // Retry upload after folder creation
      response = await fetch(graphUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ticketContent, null, 2),
      });

      data = await response.json();
    } catch (folderErr) {
      console.warn("[OneDrive Service] Could not create folder. Falling back to root directory...");
    }

    // Secondary fallback: Upload directly to root directory if folder retry still fails
    if (!response.ok) {
      const rootGraphUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${fileName}:/content`;
      response = await fetch(rootGraphUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ticketContent, null, 2),
      });
      data = await response.json();
    }
  }

  if (!response.ok) {
    console.error("OneDrive Graph API Upload Error:", data);
    throw new Error(
      data.error?.message || "Failed to upload support ticket JSON to OneDrive",
    );
  }

  return {
    success: true,
    fileName,
    onedriveFileId: data.id,
    webUrl: data.webUrl,
    ticket: ticketContent,
  };
};
