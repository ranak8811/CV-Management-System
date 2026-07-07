import { prisma } from "../config/db";

const createProject = async (req, res) => {
  const userId = req.user.id;

  const { name, description, startDate, endDate, tags, version } = req.body;

  if (!name || !description || !startDate || version === undefined) {
    return res
      .status(400)
      .json({ success: false, message: "Required fields missing" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.version !== Number(version)) {
      return res.status(409).json({
        success: false,
        message: "Conflict detected: Profile has changed. Please refresh.",
      });
    }

    const newProject = await prisma.project.create({
      data: {
        userId,
        name: name.trim(),
        description: description.trim(),
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        tags: Array.isArray(tags) ? tags.map((t) => t.trim()) : [],
      },
    });

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        version: { increment: 1 },
      },
      select: { version: true },
    });

    res.status(201).json({
      success: true,
      data: newProject,
      newVersion: updatedUser.version,
    });
  } catch (error) {
    console.error("Create project error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create project" });
  }
};
