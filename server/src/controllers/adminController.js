import { prisma } from "../config/db.js";

const getAllUsers = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const totalItems = await prisma.user.count();
    const totalPages = Math.ceil(totalItems / limit);

    const users = await prisma.user.findMany({
      skip,
      take: limit,
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

    res.json({
      success: true,
      data: users,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit,
      },
    });
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
    res
      .status(500)
      .json({ success: false, message: "Failed to update user block state" });
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

  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
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
  } catch (error) {
    console.error("Update user role error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update user role" });
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;
  const adminId = req.user.id;

  if (id === adminId) {
    return res.status(400).json({
      success: false,
      message: "You cannot delete your own admin account",
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

    await prisma.userAttributeValue.deleteMany({ where: { userId: id } });
    await prisma.project.deleteMany({ where: { userId: id } });
    await prisma.discussionPost.deleteMany({ where: { userId: id } });
    await prisma.cVLike.deleteMany({ where: { userId: id } });

    const userCVs = await prisma.cV.findMany({
      where: { candidateId: id },
      select: { id: true },
    });
    const cvIds = userCVs.map((c) => c.id);

    if (cvIds.length > 0) {
      await prisma.cVLike.deleteMany({ where: { cvId: { in: cvIds } } });
      await prisma.cV.deleteMany({ where: { candidateId: id } });
    }

    await prisma.user.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "User account and all related data deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete user account" });
  }
};

export { getAllUsers, toggleBlockUser, updateUserRole, deleteUser };
