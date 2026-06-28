import express from "express";
import { githubLogin, googleLogin } from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/google", googleLogin);

router.post("/github", githubLogin);

router.get("/profile", protect, (req, res) => {
  res.json({
    success: true,
    message: "Profile data retrieved successfully",
    user: req.user,
  });
});

export default router;
