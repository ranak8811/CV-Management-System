import express from "express";
import {
  createAttribute,
  getAttributes,
} from "../controllers/attributeController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", protect, authorize("RECRUITER", "ADMIN"), createAttribute);
router.get("/", protect, getAttributes);

export default router;
