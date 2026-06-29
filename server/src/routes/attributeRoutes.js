import express from "express";
import {
  createAttribute,
  deleteAttribute,
  getAttributes,
  updateAttribute,
} from "../controllers/attributeController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getAttributes);

router.post("/", protect, authorize("RECRUITER", "ADMIN"), createAttribute);

router.put("/:id", protect, authorize("RECRUITER", "ADMIN"), updateAttribute);

router.delete(
  "/:id",
  protect,
  authorize("RECRUITER", "ADMIN"),
  deleteAttribute,
);

export default router;
