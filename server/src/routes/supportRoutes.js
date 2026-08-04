import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { createSupportTicket } from "../controllers/supportController.js";

const router = express.Router();

router.post("/tickets", protect, createSupportTicket);

export default router;
