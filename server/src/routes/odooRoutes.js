import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  generateOdooToken,
  exportOdooData,
  importItemFromOdoo,
} from "../controllers/odooController.js";

const router = express.Router();

router.post("/positions/:id/odoo-token", protect, generateOdooToken);

router.get("/export", exportOdooData);

router.post("/import-item", importItemFromOdoo);

export default router;
