import express from "express";
import {
  createProject,
  updateProject,
  deleteProject,
  getUniqueTags,
} from "../controllers/projectController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/tags", protect, getUniqueTags);
router.post("/", protect, createProject);
router.put("/:id", protect, updateProject);
router.delete("/:id", protect, deleteProject);

export default router;
