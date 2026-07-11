import { prisma } from "../config/db.js";

const getLandingPageData = async (req, res) => {
  try {
    const latestPositions = await prisma.position.findMany({
      take: 5,
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { cvs: true } },
      },
    });

    const popularPositions = await prisma.position.findMany({
      take: 5,
      orderBy: {
        cvs: {
          _count: "desc",
        },
      },
      include: {
        _count: { select: { cvs: true } },
      },
    });

    const totalPositions = await prisma.position.count();

    const totalCandidates = await prisma.user.count({
      where: { role: "CANDIDATE" },
    });
    const totalRecruiters = await prisma.user.count({
      where: { role: "RECRUITER" },
    });

    const totalSubmittedCVs = await prisma.cV.count({
      where: { isPublished: true },
    });

    const cvsLast24Hours = await prisma.cV.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    const positionsWithTags = await prisma.position.findMany({
      select: {
        projectTags: true,
      },
    });

    const projectsWithTags = await prisma.project.findMany({
      select: { tags: true },
    });

    const tagSet = new Set();
    positionsWithTags.forEach((pos) => {
      if (pos.projectTags) {
        pos.projectTags.forEach((tag) => tagSet.add(tag.trim()));
      }
    });

    projectsWithTags.forEach((proj) => {
      if (proj.tags) {
        proj.tags.forEach((tag) => tagSet.add(tag.trim()));
      }
    });

    const uniqueTags = Array.from(tagSet);

    res.json({
      success: true,
      data: {
        latestPositions,
        popularPositions,
        tags: uniqueTags,
        statistics: {
          totalPositions,
          totalCandidates,
          totalRecruiters,
          totalSubmittedCVs,
          cvsLast24Hours,
        },
      },
    });
  } catch (error) {
    console.error("Fetch landing page data error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load public statistics",
    });
  }
};

export { getLandingPageData };
