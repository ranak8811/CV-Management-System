import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "../config/db.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "30d" },
  );
};

const ensureAndSeedValue = async (userId, attrName, value) => {
  let attr = await prisma.attribute.findUnique({
    where: { name: attrName },
  });

  if (!attr) {
    const defaultCategory = "Personal Information";
    const defaultType = attrName === "Personal Photo" ? "IMAGE" : "STRING";
    attr = await prisma.attribute.create({
      data: { name: attrName, category: defaultCategory, type: defaultType },
    });
  }

  await prisma.userAttributeValue.upsert({
    where: {
      userId_attributeId: {
        userId,
        attributeId: attr.id,
      },
    },
    update: { value: String(value) },
    create: {
      userId,
      attributeId: attr.id,
      value: String(value),
    },
  });
};

const registerUser = async (req, res) => {
  const { firstName, lastName, email, password, image } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "First name, last name, email, and password are required",
    });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: fullName,
        password: hashedPassword,
        role: "CANDIDATE",
      },
    });

    await ensureAndSeedValue(user.id, "First Name", firstName.trim());
    await ensureAndSeedValue(user.id, "Last Name", lastName.trim());
    await ensureAndSeedValue(user.id, "Personal Photo", image || "");
    await ensureAndSeedValue(user.id, "Location", "");

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ success: false, message: "Registration failed" });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Email and password are required" });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.password) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account is blocked by the Administrator",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Login failed" });
  }
};

const googleLogin = async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res
      .status(400)
      .json({ success: false, message: "Credential token is required" });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name } = payload;
    const normalizedEmail = email.toLowerCase().trim();

    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user && user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account is blocked by the Administrator",
      });
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name,
          role: "CANDIDATE",
        },
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Google login error:", error);
    res
      .status(500)
      .json({ success: false, message: "Google authentication failed" });
  }
};

const githubLogin = async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res
      .status(400)
      .json({ success: false, message: "OAuth code is required" });
  }

  try {
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "CV-Management-System",
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        }),
      },
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("GitHub token exchange error:", tokenData);
      return res.status(400).json({
        success: false,
        message:
          tokenData.error_description || "GitHub OAuth code exchange failed",
      });
    }

    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: "Access token not found",
      });
    }

    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "CV-Management-System",
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error(
        `Failed to fetch GitHub user profile. Status: ${userResponse.status}, Error: ${errorText}`,
      );
      return res.status(500).json({
        success: false,
        message: "Failed to fetch user profile from GitHub",
      });
    }

    const userData = await userResponse.json();
    let email = userData.email;

    if (!email) {
      const emailsResponse = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "CV-Management-System",
        },
      });

      if (!emailsResponse.ok) {
        const errorText = await emailsResponse.text();
        console.error(
          `Failed to fetch GitHub user emails. Status: ${emailsResponse.status}, Response: ${errorText}`,
        );
        return res.status(500).json({
          success: false,
          message: "Failed to fetch emails from GitHub",
        });
      }

      const emailsData = await emailsResponse.json();

      if (Array.isArray(emailsData)) {
        const primaryEmailObj =
          emailsData.find((email) => email.primary) || emailsData[0];
        email = primaryEmailObj ? primaryEmailObj.email : null;
      }
    }

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "GitHub account must have an email" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user && user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account is blocked by the Administrator",
      });
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: userData.name || userData.login,
          role: "CANDIDATE",
        },
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("GitHub login error:", error);
    res
      .status(500)
      .json({ success: false, message: "GitHub authentication failed" });
  }
};

export { registerUser, loginUser, googleLogin, githubLogin };
