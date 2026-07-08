import express from "express";
import {
  createCV,
  getCVById,
  getCandidateCVs,
  getPositionCVs,
  updateCV,
  saveCVAttributeValue,
  deleteCV,
} from "../controllers/cvController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/my", protect, getCandidateCVs);
router.get("/position/:positionId", protect, getPositionCVs);
router.get("/:id", protect, getCVById);
router.post("/", protect, createCV);
router.put("/:id", protect, updateCV);
router.post("/:id/attribute", protect, saveCVAttributeValue);
router.delete("/:id", protect, deleteCV);

export default router;
