const getSalesforceAccessToken = async () => {
  const clientId = process.env.SALESFORCE_CLIENT_ID || process.env.Consumer_Key;
  const clientSecret =
    process.env.SALESFORCE_CLIENT_SECRET || process.env.Consumer_Secret;
  const username = process.env.SALESFORCE_USERNAME;
  const password = process.env.SALESFORCE_PASSWORD;
  const securityToken = process.env.SALESFORCE_SECURITY_TOKEN || "";
  const loginUrl =
    process.env.SALESFORCE_LOGIN_URL || "https://login.salesforce.com";

  if (!clientId || !clientSecret || !username || !password) {
    throw new Error(
      "Salesforce credentials (Consumer_Key/CLIENT_ID, Consumer_Secret/CLIENT_SECRET, SALESFORCE_USERNAME, SALESFORCE_PASSWORD) are missing in server/.env",
    );
  }

  const fullPassword = `${password}${securityToken}`;

  const params = new URLSearchParams({
    grant_type: "password",
    client_id: clientId,
    client_secret: clientSecret,
    username: username,
    password: fullPassword,
  });

  const response = await fetch(`${loginUrl}/services/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Salesforce Token Error Response:", data);
    throw new Error(
      data.error_description || "Failed to authenticate with Salesforce API",
    );
  }

  return {
    accessToken: data.access_token,
    instanceUrl: data.instance_url,
  };
};

const createSalesforceAccount = async (
  accessToken,
  instanceUrl,
  accountData,
) => {
  const response = await fetch(
    `${instanceUrl}/services/data/v58.0/sobjects/Account`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Name: accountData.companyName || "Candidate Company",
        Industry: accountData.industry || "Technology",
        Phone: accountData.phone || "",
      }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Salesforce Account Error Response:", data);
    const msg = Array.isArray(data) ? data[0]?.message : data?.message;
    throw new Error(msg || "Failed to create Salesforce Account object");
  }

  return data.id;
};

const createSalesforceContact = async (
  accessToken,
  instanceUrl,
  contactData,
) => {
  const nameParts = (contactData.name || "Candidate").trim().split(" ");
  const firstName =
    nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : "";
  const lastName = nameParts[nameParts.length - 1] || "Candidate";

  const response = await fetch(
    `${instanceUrl}/services/data/v58.0/sobjects/Contact`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        FirstName: firstName,
        LastName: lastName,
        Email: contactData.email,
        Phone: contactData.phone || "",
        Title: contactData.jobTitle || "Candidate",
        AccountId: contactData.accountId,
      }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Salesforce Contact Error Response:", data);
    const msg = Array.isArray(data) ? data[0]?.message : data?.message;
    throw new Error(msg || "Failed to create Salesforce Contact object");
  }

  return data.id;
};

export const syncCandidateToSalesforce = async ({
  name,
  email,
  companyName,
  phone,
  jobTitle,
  industry,
}) => {
  const { accessToken, instanceUrl } = await getSalesforceAccessToken();

  const accountId = await createSalesforceAccount(accessToken, instanceUrl, {
    companyName,
    industry,
    phone,
  });

  const contactId = await createSalesforceContact(accessToken, instanceUrl, {
    name,
    email,
    phone,
    jobTitle,
    accountId,
  });

  return {
    salesforceAccountId: accountId,
    salesforceContactId: contactId,
  };
};
