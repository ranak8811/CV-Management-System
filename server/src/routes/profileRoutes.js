import express from "express";
import {
  getProfile,
  saveProfileAttribute,
  addProfileAttribute,
  removeProfileAttribute,
} from "../controllers/profileController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getProfile);
router.post("/attribute", protect, saveProfileAttribute);
router.post("/attribute/add", protect, addProfileAttribute);
router.post("/attribute/remove", protect, removeProfileAttribute);

export default router;
