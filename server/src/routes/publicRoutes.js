import express from "express";
import { getLandingPageData } from "../controllers/publicController.js";

const router = express.Router();

router.get("/landing", getLandingPageData);

export default router;
