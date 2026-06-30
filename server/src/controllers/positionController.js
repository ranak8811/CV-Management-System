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
