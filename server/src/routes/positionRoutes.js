import express from "express";
import {
  createPosition,
  deletePosition,
  duplicatePosition,
  getPositions,
  updatePosition,
} from "../controllers/positionController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", getPositions);

router.post("/", protect, authorize("RECRUITER", "ADMIN"), createPosition);

router.post(
  "/:id/duplicate",
  protect,
  authorize("RECRUITER", "ADMIN"),
  duplicatePosition,
);
router.put("/:id", protect, authorize("RECRUITER", "ADMIN"), updatePosition);
router.delete("/:id", protect, authorize("RECRUITER", "ADMIN"), deletePosition);

export default router;
