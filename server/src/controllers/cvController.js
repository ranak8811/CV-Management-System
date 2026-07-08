import { prisma } from "../config/db.js";

const checkAccessRules = (rules, attributeValues) => {
  for (const rule of rules) {
    const userValObj = attributeValues.find(
      (uv) => uv.attributeId === rule.attributeId,
    );
    const value = userValObj ? userValObj.value : "";

    switch (rule.operator) {
      case "EQUALS":
        if (value.toLowerCase() !== rule.value.toLowerCase()) return false;
        break;
      case "GREATER_THAN":
        if (Number(value) <= Number(rule.value)) return false;
        break;
      case "LESS_THAN":
        if (Number(value) >= Number(rule.value)) return false;
        break;
      case "CONTAINS":
        if (!value.toLowerCase().includes(rule.value.toLowerCase()))
          return false;
        break;
      case "IS_CHECKED":
        if (value !== "true") return false;
        break;

      default:
        break;
    }

    return true;
  }
};

const createCV = async (req, res) => {
  const candidateId = req.user.id;
  const { positionId, name } = req.body;

  if (!positionId) {
    return res
      .status(400)
      .json({ success: false, message: "PositionId is required" });
  }

  try {
    const position = await prisma.position.findUnique({
      where: { id: positionId },
      include: { accessRules: true, positionAttributes: true },
    });

    if (!position) {
      return res
        .status(404)
        .json({ success: false, message: "Position not found" });
    }

    const existingCV = await prisma.cV.findUnique({
      where: {
        candidateId_positionId: {
          candidateId,
          positionId,
        },
      },
    });

    if (existingCV) {
      return res.status(400).json({
        success: false,
        message: "You already have a CV for this position",
      });
    }

    if (!position.isPublic) {
      const userAttributes = await prisma.userAttributeValue.findMany({
        where: { userId: candidateId },
      });

      const hasAccess = checkAccessRules(position.accessRules, userAttributes);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "You do not satisfy the access rules for this position",
        });
      }
    }

    const newCV = await prisma.cV.create({
      data: {
        candidateId,
        positionId,
        name: name ? name.trim() : `CV for ${position.title}`,
        status: "Inactive",
        isPublished: false,
        version: 1,
      },
    });

    for (const pa of position.positionAttributes) {
      const existingVal = await prisma.userAttributeValue.findUnique({
        where: {
          userId_attributeId: {
            userId: candidateId,
            attributeId: pa.attributeId,
          },
        },
      });

      if (!existingVal) {
        await prisma.userAttributeValue.create({
          data: {
            userId: candidateId,
            attributeId: pa.attributeId,
            value: "",
          },
        });
      }
    }

    await prisma.user.update({
      where: { id: candidateId },
      data: {
        version: { increment: 1 },
      },
    });

    res.status(201).json({ success: true, data: newCV });
  } catch (error) {
    console.error("Create CV error:", error);
    res.status(500).json({ success: false, message: "Failed to create CV" });
  }
};

const getCVById = async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const { id } = req.params;

  try {
    const cv = await prisma.cV.findUnique({
      where: { id },
      include: {
        position: {
          include: {
            positionAttributes: {
              include: { attribute: { include: { options: true } } },
              orderBy: { order: "asc" },
            },
          },
        },

        candidate: {
          select: { id: true, email: true, name: true, version: true },
        },
        projects: true,
        likes: true,
      },
    });

    if (!cv) {
      return res.status(404).json({ success: false, message: "CV not found" });
    }

    if (userRole === "CANDIDATE" && cv.candidateId !== userId) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized access to this CV" });
    }

    if (userRole === "RECRUITER" && !cv.isPublished) {
      return res.status(403).json({
        success: false,
        message: "Draft CVs are not visible to recruiters",
      });
    }

    const attributeIds = cv.position.positionAttributes.map(
      (pa) => pa.attributeId,
    );

    const candidateAttributes = await prisma.userAttributeValue.findMany({
      where: {
        userId: cv.candidateId,
        attributeId: { in: attributeIds },
      },
      include: {
        attribute: { include: { options: true } },
      },
    });

    res.json({
      success: true,
      data: {
        cv,
        attributeValues: candidateAttributes,
      },
    });
  } catch (error) {
    console.error("Get CV error:", error);
    res.status(500).json({ success: false, message: "Failed to retrieve CV" });
  }
};

const getCandidateCVs = async (req, res) => {
  const candidateId = req.user.id;

  try {
    const cvs = await prisma.cV.findMany({
      where: { candidateId },
      include: {
        position: true,
        _count: { select: { likes: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: cvs });
  } catch (error) {
    console.error("Get candidate CVs error:", error);
    res.status(500).json({ success: false, message: "Failed to retrieve CVs" });
  }
};

const getPositionCVs = async (req, res) => {
  const { positionId } = req.params;
  const userRole = req.user.role;

  try {
    const whereClause = { positionId };

    if (userRole === "RECRUITER") {
      whereClause.isPublished = true;
    }

    const cvs = await prisma.cV.findMany({
      where: whereClause,
      include: {
        candidate: {
          select: { id: true, name: true, email: true },
        },
        _count: { select: { likes: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: cvs });
  } catch (error) {
    console.error("Get position CVs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve CVs for this position",
    });
  }
};

const updateCV = async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const { id } = req.params;

  const { name, status, isPublished, projectIds, version } = req.body;

  if (version === undefined) {
    return res
      .status(400)
      .json({ success: false, message: "Version is required" });
  }

  try {
    const cv = await prisma.cV.findUnique({
      where: { id },
    });

    if (userRole === "CANDIDATE" && cv.candidateId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to this CV",
      });
    }

    if (cv.version !== Number(version)) {
      return res.status(409).json({
        success: false,
        message:
          "Conflict detected: CV has been modified elsewhere. Please refresh.",
      });
    }

    const updateData = {};

    if (name) updateData.name = name.trim();
    if (status) updateData.status = status.trim();
    if (isPublished !== undefined) updateData.isPublished = isPublished;

    if (Array.isArray(projectIds)) {
      updateData.projects = {
        set: projectIds.map((pid) => ({ id: pid })),
      };
    }

    updateData.version = { increment: 1 };

    const updatedCV = await prisma.cV.update({
      where: { id },
      data: updateData,
      include: { projects: true },
    });

    res.json({
      success: true,
      data: updatedCV,
      neVersion: updatedCV.version,
    });
  } catch (error) {
    console.error("Update CV error:", error);
    res.status(500).json({ success: false, message: "Failed to update CV" });
  }
};

const saveCVAttributeValue = async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const { id } = req.params;
  const { attributeId, value, cvVersion, userVersion } = req.body;

  if (
    !attributeId ||
    value === undefined ||
    cvVersion === undefined ||
    userVersion === undefined
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Required fields missing" });
  }

  try {
    const cv = await prisma.cV.findUnique({
      where: { id },
    });

    if (!cv) {
      return res.status(404).json({ success: false, message: "CV not found" });
    }

    if (userRole === "CANDIDATE" && cv.candidateId !== userId) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized access" });
    }

    if (cv.version !== Number(cvVersion)) {
      return res.status(409).json({
        success: false,
        message: "Conflict: CV has changed. Please refresh.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: cv.candidateId },
    });

    if (!user || user.version !== Number(userVersion)) {
      return res.status(409).json({
        success: false,
        message: "Conflict: Profile has changed. Please refresh.",
      });
    }

    await prisma.userAttributeValue.upsert({
      where: {
        userId_attributeId: {
          userId: cv.candidateId,
          attributeId,
        },
      },
      update: { value: String(value) },
      create: {
        userId: cv.candidateId,
        attributeId,
        value: String(value),
      },
    });

    const updatedUser = await prisma.user.update({
      where: { id: cv.candidateId },
      data: {
        version: { increment: 1 },
      },
      select: { version: true },
    });

    const updatedCV = await prisma.cV.update({
      where: { id },
      data: {
        version: { increment: 1 },
      },
      select: { version: true },
    });

    res.json({
      success: true,
      newCVVersion: updatedCV.version,
      newUserVersion: updatedUser.version,
    });
  } catch (error) {
    console.error("Save CV attribute error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to save attribute" });
  }
};

const deleteCV = async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const { id } = req.params;
  const { version } = req.body;

  if (version === undefined) {
    return res
      .status(400)
      .json({ success: false, message: "Version is required" });
  }

  try {
    const cv = await prisma.cV.findUnique({
      where: { id },
    });

    if (!cv) {
      return res.status(404).json({ success: false, message: "CV not found" });
    }

    if (userRole === "CANDIDATE" && cv.candidateId !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (cv.version !== Number(version)) {
      return res.status(409).json({
        success: false,
        message: "Conflict detected: CV has changed. Please refresh.",
      });
    }

    await prisma.cV.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Delete CV error:", error);
    res.status(500).json({ success: false, message: "Failed to delete CV" });
  }
};
