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

const toggleBlockUser = async (req, res) => {
  const { id } = req.params;
  const adminId = req.user.id;

  if (id === adminId) {
    return res.status(400).json({
      success: false,
      message: "You cannot block or unblock yourself",
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const nextBlockState = !user.isBlocked;

    await prisma.user.update({
      where: { id },
      data: {
        isBlocked: nextBlockState,
        version: { increment: 1 },
      },
    });

    res.json({
      success: true,
      message: `User successfully ${nextBlockState ? "blocked" : "unblocked"}`,
    });
  } catch (error) {
    console.error("Toggle block error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user block state",
    });
  }
};

const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role || !["CANDIDATE", "RECRUITER", "ADMIN"].includes(role)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid role value" });
  }
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      role,
      version: { increment: 1 },
    },
  });

  res.json({
    success: true,
    message: "User role updated successfully",
    data: {
      id: updatedUser.id,
      role: updatedUser.role,
    },
  });

  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });
  } catch (error) {
    console.error("Update user role error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update user role" });
  }
};
