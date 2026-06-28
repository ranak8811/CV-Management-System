import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
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

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
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
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        }),
      },
    );

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: "Invalid code or token exchange failed",
      });
    }

    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${accessToken}`,
      },
    });

    const userData = await userResponse.json();

    const emailsResponse = await fetch("https://api.github.com/user/emails", {
      headers: { Authorization: `token ${accessToken}` },
    });

    const emailsData = await emailsResponse.json();

    const primaryEmailObj =
      emailsData.find((email) => email.primary) || emailsData[0];
    const email = primaryEmailObj ? primaryEmailObj.email : null;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "GitHub account must have an email",
      });
    }

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
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

export { googleLogin, githubLogin };
