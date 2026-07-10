import { prisma } from "../config/db.js";

const getDiscussionPosts = async (req, res) => {
  const { positionId } = req.params;

  try {
    const posts = await prisma.discussionPost.findMany({
      where: { positionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    res.json({ success: true, data: posts });
  } catch (error) {
    console.error("Fetch discussion posts error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch discussion posts",
    });
  }
};
