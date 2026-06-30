import express from "express";
import {
  createPosition,
  duplicatePosition,
} from "../controllers/positionController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", protect, authorize("RECRUITER", "ADMIN"), createPosition);
router.post(
  "/:id/duplicate",
  protect,
  authorize("RECRUITER", "ADMIN"),
  duplicatePosition,
);

export default router;
