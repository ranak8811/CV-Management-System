import { prisma } from "../config/db.js";

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
  const { id } = req.params;

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

const getPositions = async (req, res) => {
  const { search } = req.query;

  try {
    const whereClause = {};

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const positions = await prisma.position.findMany({
      where: whereClause,
      include: {
        positionAttributes: { include: { attribute: true } },
        accessRules: { include: { attribute: true } },
        _count: { select: { cvs: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    res.json({ success: true, data: positions });
  } catch (error) {
    console.error("Fetch positions error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch positions" });
  }
};

const updatePosition = async (req, res) => {
  const { id } = req.params;

  const {
    title,
    description,
    isPublic,
    maxProjects,
    projectTags,
    version,
    selectedAttributes,
    accessRules,
  } = req.body;

  if (version === undefined) {
    return res.status(400).json({
      success: false,
      message: "Version is required for optimistic locking",
    });
  }

  try {
    const orgininal = await prisma.position.findUnique({ where: { id } });

    if (!original) {
      return res
        .status(404)
        .json({ success: false, message: "Position not found" });
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.position.updateMany({
        where: { id, version: Number(version) },
        data: {
          title: title || original.title,
          description: description || original.description,
          isPublic: isPublic !== undefined ? isPublic : original.isPublic,
          maxProjects:
            maxProjects !== undefined
              ? Number(maxProjects)
              : original.maxProjects,
          projectTags: Array.isArray(projectTags)
            ? projectTags
            : original.projectTags,
          version: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        throw new Error("VersionConflict");
      }

      if (Array.isArray(selectedAttributes)) {
        await tx.positionAttribute.deleteMany({ where: { positionId: id } });

        if (selectedAttributes.length > 0) {
          await tx.positionAttribute.createMany({
            data: selectedAttributes.map((attr) => ({
              positionId: id,
              attributeId: attr.attributeId,
              order: attr.order !== undefined ? Number(attr.order) : 0,
            })),
          });
        }
      }

      if (Array.isArray(accessRules)) {
        await tx.accessRule.deleteMany({ where: { positionId: id } });

        const checkPublic = isPublic !== undefined ? isPublic : origin.isPublic;

        if (!checkPublic && accessRules.length > 0) {
          await tx.accessRule.createMany({
            data: accessRules.map((rule) => ({
              positionId: id,
              attributeId: rule.attributeId,
              operator: rule.operator,
              value: String(rule.value),
            })),
          });
        }
      }
    });

    const updatedPosition = await prisma.position.findUnique({
      where: { id },
      include: {
        positionAttributes: { include: { attribute: true } },
        accessRules: { include: { attribute: true } },
      },
    });

    res.json({ success: true, data: updatePosition });
  } catch (error) {
    if (error.message === "VersionConflict") {
      return res.status(409).json({
        success: false,
        message:
          "Conflict: This position has been modified by another user. Please reload and try again.",
      });
    }
    console.error("Update position error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update position" });
  }
};

const deletePosition = async (req, res) => {
  const { id } = req.params;

  try {
    const position = await prisma.position.findUnique({ where: { id } });

    if (!position) {
      return res
        .status(404)
        .json({ success: false, message: "Position not found" });
    }

    await prisma.position.delete({ where: { id } });

    res.json({ success: true, message: "Position deleted successfully" });
  } catch (error) {
    console.error("Delete position error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete position" });
  }
};

const getPositionById = async (req, res) => {
  const { id } = req.params;

  try {
    const position = await prisma.position.findUnique({
      where: { id },
      include: {
        positionAttributes: { include: { attribute: true } },
        accessRules: { include: { attribute: true } },
      },
    });

    if (!position) {
      return res
        .status(404)
        .json({ success: false, message: "Position not found" });
    }

    res.json({ success: true, data: position });
  } catch (error) {
    console.error("Fetch single position error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch position" });
  }
};

export {
  createPosition,
  duplicatePosition,
  getPositions,
  updatePosition,
  deletePosition,
  getPositionById,
};
