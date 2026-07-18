import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../config/db.js";
import { sendVerificationEmail } from "../utils/emailService.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
};

const getPersonalPhoto = async (userId) => {
  const photo = await prisma.userAttributeValue.findFirst({
    where: {
      userId,
      attribute: { name: "Personal Photo" },
    },
    select: { value: true },
  });
  return photo ? photo.value : "";
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
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: fullName,
        password: hashedPassword,
        role: "CANDIDATE",
        verificationToken,
      },
    });

    await ensureAndSeedValue(user.id, "First Name", firstName.trim());
    await ensureAndSeedValue(user.id, "Last Name", lastName.trim());
    await ensureAndSeedValue(user.id, "Personal Photo", image || "");
    await ensureAndSeedValue(user.id, "Location", "");

    await sendVerificationEmail(normalizedEmail, verificationToken, user.name);

    res.status(201).json({
      success: true,
      message: "Registration successful! Please verify your email address. Check your inbox for the verification link.",
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

    if (user.verificationToken) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email address before logging in. Check your inbox for the verification link.",
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
        image: await getPersonalPhoto(user.id),
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Login failed" });
  }
};

const verifyEmail = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send("<h1>Verification token is missing.</h1>");
  }

  try {
    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      return res
        .status(400)
        .send("<h1>Invalid or expired verification token.</h1>");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken: null },
    });

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    return res.redirect(`${clientUrl}/login?verified=true`);
  } catch (error) {
    console.error("Email verification error:", error);
    res
      .status(500)
      .send("<h1>Internal Server Error during email verification.</h1>");
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

    if (user && user.verificationToken) {
      await prisma.user.update({
        where: { id: user.id },
        data: { verificationToken: null },
      });
      user.verificationToken = null;
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name,
          role: "CANDIDATE",
          verificationToken: null,
        },
      });

      const nameParts = name ? name.split(" ") : ["Google", "User"];
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || "";
      await ensureAndSeedValue(user.id, "First Name", firstName);
      await ensureAndSeedValue(user.id, "Last Name", lastName);
      await ensureAndSeedValue(user.id, "Personal Photo", payload.picture || "");
      await ensureAndSeedValue(user.id, "Location", "");
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
        image: await getPersonalPhoto(user.id),
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
      }
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
        `Failed to fetch GitHub user profile. Status: ${userResponse.status}, Error: ${errorText}`
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
          `Failed to fetch GitHub user emails. Status: ${emailsResponse.status}, Response: ${errorText}`
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

    if (user && user.verificationToken) {
      await prisma.user.update({
        where: { id: user.id },
        data: { verificationToken: null },
      });
      user.verificationToken = null;
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: userData.name || userData.login,
          role: "CANDIDATE",
          verificationToken: null,
        },
      });

      const nameParts = (userData.name || userData.login).split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || "";
      await ensureAndSeedValue(user.id, "First Name", firstName);
      await ensureAndSeedValue(user.id, "Last Name", lastName);
      await ensureAndSeedValue(user.id, "Personal Photo", userData.avatar_url || "");
      await ensureAndSeedValue(user.id, "Location", "");
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
        image: await getPersonalPhoto(user.id),
      },
    });
  } catch (error) {
    console.error("GitHub login error:", error);
    res
      .status(500)
      .json({ success: false, message: "GitHub authentication failed" });
  }
};

export { registerUser, loginUser, verifyEmail, googleLogin, githubLogin };
