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
