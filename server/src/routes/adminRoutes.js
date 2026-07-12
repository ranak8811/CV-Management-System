import express from "express";
import { protect, authorize } from "../middlewares/authMiddleware.js";
import {
  getAllUsers,
  toggleBlockUser,
  updateUserRole,
  deleteUser,
} from "../controllers/adminController.js";

const router = express.Router();

router.use(protect);
router.use(authorize("ADMIN"));

router.get("/users", getAllUsers);
router.post("/users/:id/block", toggleBlockUser);
router.put("/users/:id/role", updateUserRole);
router.delete("/users/:id", deleteUser);

export default router;
