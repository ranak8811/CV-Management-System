import { prisma } from "../config/db.js";

const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBlocked: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: users });
  } catch (error) {
    console.error("Get all users error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to retrieve users" });
  }
};
