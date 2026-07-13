import express from "express";
import {
  createCV,
  getCVById,
  getCandidateCVs,
  getPositionCVs,
  updateCV,
  saveCVAttributeValue,
  deleteCV,
  toggleLikeCV,
  getCVs,
} from "../controllers/cvController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/my", protect, getCandidateCVs);
router.get("/position/:positionId", protect, getPositionCVs);
router.get("/", protect, getCVs);
router.get("/:id", protect, getCVById);
router.post("/", protect, createCV);
router.put("/:id", protect, updateCV);
router.post("/:id/attribute", protect, saveCVAttributeValue);
router.delete("/:id", protect, deleteCV);
router.post("/:id/like", protect, toggleLikeCV);

export default router;
