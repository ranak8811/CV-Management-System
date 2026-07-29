import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { syncUserToSalesforce } from "../controllers/salesforceController.js";

const router = express.Router();

router.post("/sync", protect, syncUserToSalesforce);

export default router;
