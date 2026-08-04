const getSalesforceAccessToken = async () => {
  const rawClientId =
    process.env.SALESFORCE_CLIENT_ID || process.env.Consumer_Key;
  const rawClientSecret =
    process.env.SALESFORCE_CLIENT_SECRET || process.env.Consumer_Secret;
  const rawUsername = process.env.SALESFORCE_USERNAME;
  const rawPassword = process.env.SALESFORCE_PASSWORD;
  const rawSecurityToken = process.env.SALESFORCE_SECURITY_TOKEN || "";
  const loginUrl = (
    process.env.SALESFORCE_LOGIN_URL || "https://login.salesforce.com"
  ).trim();

  const clientId = rawClientId ? rawClientId.trim() : "";
  const clientSecret = rawClientSecret ? rawClientSecret.trim() : "";
  const username = rawUsername ? rawUsername.trim() : "";
  const password = rawPassword ? rawPassword.trim() : "";
  const securityToken = rawSecurityToken ? rawSecurityToken.trim() : "";

  if (!clientId || !clientSecret) {
    throw new Error(
      "Salesforce credentials (SALESFORCE_CLIENT_ID/Consumer_Key, SALESFORCE_CLIENT_SECRET/Consumer_Secret) are missing in server/.env",
    );
  }

  console.log(
    `[Salesforce Auth] Attempting token request for username: "${username}"...`,
  );
  console.log(
    `[Salesforce Auth Debug] Password length: ${password.length}, SecurityToken length: ${securityToken.length}`,
  );

  if (username && password) {
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

    if (response.ok) {
      console.log("[Salesforce Auth Success] OAuth Password Flow succeeded.");
      return {
        accessToken: data.access_token,
        instanceUrl: data.instance_url,
      };
    }

    console.warn("[Salesforce Auth Password Flow Failed]:", data);
  }

  console.log("[Salesforce Auth] Attempting Client Credentials Flow...");
  const ccParams = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const ccResponse = await fetch(`${loginUrl}/services/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: ccParams.toString(),
  });

  const ccData = await ccResponse.json();

  if (ccResponse.ok) {
    console.log("[Salesforce Auth Success] Client Credentials Flow succeeded.");
    return {
      accessToken: ccData.access_token,
      instanceUrl: ccData.instance_url,
    };
  }

  console.error("[Salesforce Auth Client Credentials Flow Failed]:", ccData);

  throw new Error(
    "Salesforce authentication failed (Password & Client Credentials flows). Please verify your password, security token, or Salesforce My Domain login URL.",
  );
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
        "Sforce-Duplicate-Rule-Header": "allowSave=true",
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
        "Sforce-Duplicate-Rule-Header": "allowSave=true",
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
