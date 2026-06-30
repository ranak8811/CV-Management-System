import { prisma } from "../config/db";

const createPosition = async (req, res) => {
  const {
    title,
    description,
    isPublic,
    maxProjects,
    projectTags,
    selectedAttributes,
    accessRules,
  } = req.body;

  if (!title || !description) {
    return res.status(400).json({
      success: false,
      message: "Title and description are required",
    });
  }

  try {
    const newPosition = await prisma.$transaction(async (tx) => {
      const position = await tx.position.create({
        data: {
          title,
          description,
          isPublic: isPublic !== undefined ? isPublic : true,
          maxProjects: maxProjects !== undefined ? Number(maxProjects) : 3,
          projectTags: Array.isArray(projectTags) ? projectTags : [],
          version: 1,
        },
      });

      if (Array.isArray(selectedAttributes) && selectedAttributes.length > 0) {
        await tx.positionAttribute.createMany({
          data: selectedAttributes.map((attr) => ({
            positionId: position.id,
            attributeId: attr.attributeId,
            order: attr.order !== undefined ? Number(attr.order) : 0,
          })),
        });
      }

      if (
        isPublic === false &&
        Array.isArray(accessRules) &&
        accessRules.length > 0
      ) {
        await tx.accessRule.createMany({
          data: accessRules.map((rule) => ({
            positionId: position.id,
            attributeId: rule.attributeId,
            operator: rule.operator,
            value: String(rule.value),
          })),
        });
      }

      return position;
    });

    const savedPosition = await prisma.position.findUnique({
      where: { id: newPosition.id },
      include: {
        positionAttributes: { include: { attribute: true } },
        accessRules: { include: { attribute: true } },
      },
    });

    res.status(201).json({ success: true, data: savedPosition });
  } catch (error) {
    console.error("Create position error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create position" });
  }
};

const duplicatePosition = async (req, res) => {
  const { id } = req.body;

  try {
    const original = await prisma.position.findUnique({
      where: { id },
      include: {
        positionAttributes: true,
        accessRules: true,
      },
    });

    if (!original) {
      return res
        .status(404)
        .json({ success: false, message: "Original position not found" });
    }

    const duplicated = await prisma.$transaction(async (tx) => {
      const copy = await tx.position.create({
        data: {
          title: `Copy of ${original.title}`,
          description: original.description,
          isPublic: original.isPublic,
          maxProjects: original.maxProjects,
          projectTags: original.projectTags,
          version: 1,
        },
      });

      if (original.positionAttributes.length > 0) {
        await tx.positionAttribute.createMany({
          data: original.positionAttributes.map((pa) => ({
            positionId: copy.id,
            attributeId: pa.attributeId,
            order: pa.order,
          })),
        });
      }

      if (original.accessRules.length > 0) {
        await tx.accessRule.createMany({
          data: original.accessRules.map((ar) => ({
            positionId: copy.id,
            attributeId: ar.attributeId,
            operator: ar.operator,
            value: ar.value,
          })),
        });
      }

      return copy;
    });

    const fullDuplicated = await prisma.position.findUnique({
      where: { id: duplicated.id },
      include: {
        positionAttributes: { include: { attribute: true } },
        accessRules: { include: { attribute: true } },
      },
    });

    res.status(201).json({ success: true, data: fullDuplicated });
  } catch (error) {
    console.error("Duplicate position error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to duplicate position" });
  }
};

export { createPosition, duplicatePosition };
