import express from "express";
import {
  getDiscussionPosts,
  createDiscussionPost,
} from "../controllers/discussionController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/:positionId", protect, getDiscussionPosts);
router.post("/:positionId", protect, createDiscussionPost);

export default router;
