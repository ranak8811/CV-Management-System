import express from "express";
import {
  githubLogin,
  googleLogin,
  registerUser,
  loginUser,
  verifyEmail,
} from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { prisma } from "../config/db.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/verify", verifyEmail);
router.post("/google", googleLogin);
router.post("/github", githubLogin);

router.get("/profile", protect, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const photo = await prisma.userAttributeValue.findFirst({
      where: {
        userId: user.id,
        attribute: { name: "Personal Photo" },
      },
      select: { value: true },
    });

    res.json({
      success: true,
      message: "Profile data retrieved successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        image: photo ? photo.value : "",
        loginMethod: user.password ? "email" : "social",
      },
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
