import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { prisma } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import attributeRoutes from "./routes/attributeRoutes.js";
import positionRoutes from "./routes/positionRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "CV Management System Server is running successfully!" });
});

app.get("/test-db", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/attributes", attributeRoutes);
app.use("/api/positions", positionRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/projects", projectRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
