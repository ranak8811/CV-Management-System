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

const createDiscussionPost = async (req, res) => {
  const { positionId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  if (!content || content.trim() === "") {
    return res
      .status(400)
      .json({ success: false, message: "Content cannot be empty" });
  }

  try {
    const post = await prisma.discussionPost.create({
      data: {
        positionId,
        userId,
        content: content.trim(),
      },
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
    });

    const io = req.app.get("io");
    if (io) {
      io.to(positionId).emit("newPost", post);
    }

    res.status(201).json({ success: true, data: post });
  } catch (error) {
    console.error("Create discussion post error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create discussion post" });
  }
};

export { getDiscussionPosts, createDiscussionPost };
