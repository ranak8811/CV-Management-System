import { syncCandidateToSalesforce } from "../utils/salesforceService.js";

const syncUserToSalesforce = async (req, res) => {
  const user = req.user;
  const { companyName, phone, jobTitle, industry } = req.body;

  if (!companyName || !phone) {
    return res.status(400).json({
      success: false,
      message:
        "Company Name and Phone Number are required for Salesforce CRM sync.",
    });
  }

  try {
    const result = await syncCandidateToSalesforce({
      name: user.name,
      email: user.email,
      companyName,
      phone,
      jobTitle: jobTitle || "Candidate",
      industry: industry || "Technology",
    });

    res.status(201).json({
      success: true,
      message:
        "User successfully synced to Salesforce CRM as Account & Contact!",
      data: result,
    });
  } catch (error) {
    console.error("Salesforce Sync Controller Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to sync user with Salesforce CRM",
    });
  }
};

export { syncUserToSalesforce };
