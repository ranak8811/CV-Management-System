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

const updateProject = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { name, description, startDate, endDate, tags, version } = req.body;

  if (!name || !description || !startDate || version === undefined) {
    return res
      .status(400)
      .json({ success: false, message: "Required fields missing" });
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project || project.userId !== userId) {
      return res.status(404).json({
        success: false,
        message: "Project not found or unauthorized",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.version !== Number(version)) {
      return res.status(409).json({
        success: false,
        message: "Conflict detected: Profile has changed. Please refresh.",
      });
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
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

    res.json({
      success: true,
      data: updatedProject,
      newVersion: updatedUser.version,
    });
  } catch (error) {
    console.error("Update project error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update project" });
  }
};

const deleteProject = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { version } = req.body;

  if (version === undefined) {
    return res
      .status(400)
      .json({ success: false, message: "Version is required" });
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project || project.userId !== userId) {
      return res.status(404).json({
        success: false,
        message: "Project not found or unauthorized",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.version !== Number(version)) {
      return res.status(409).json({
        success: false,
        message: "Conflict detected: Profile has changed. Please refresh.",
      });
    }

    await prisma.project.delete({
      where: { id },
    });

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        version: { increment: 1 },
      },
      select: { version: true },
    });

    res.json({
      success: true,
      newVersion: updatedUser.version,
    });
  } catch (error) {
    console.error("Delete project error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete project" });
  }
};

const getUniqueTags = async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      select: { tags: true },
    });

    const allTags = projects.flatMap((p) => p.tags);
    const uniqueTags = [...new Set(allTags)];

    res.json({ success: true, data: uniqueTags });
  } catch (error) {
    console.error("Fetch unique tags error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch unique tags" });
  }
};

export { createProject, updateProject, deleteProject, getUniqueTags };
