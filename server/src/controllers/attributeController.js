import { prisma } from "../config/db";

const createAttribute = async (req, res) => {
  const { category, name, type, options } = req.body;

  if (!category || !name || !type) {
    return res.status(400).json({
      success: false,
      message: "Category, name, and type are required",
    });
  }

  try {
    const existing = await prisma.attribute.findUnique({
      where: { name },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Attribute name must be globally unique",
      });
    }

    const newAttribute = await prisma.$transaction(async (tx) => {
      const attribute = await tx.attribute.create({
        data: { category, name, type },
      });

      if (type === "DROPDOWN" && Array.isArray(options) && options.length > 0) {
        await tx.attributeOption.createMany({
          data: options.map((opt) => ({
            attributeId: attribute.id,
            value: opt.trim(),
          })),
        });
      }

      return attribute;
    });

    const attributeWithOption = await prisma.attribute.findUnique({
      where: { id: newAttribute.id },
      include: { options: true },
    });

    res.status(201).json({ success: true, data: attributeWithOption });
  } catch (error) {
    console.error("Create attribute error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create attribute" });
  }
};

const getAttributes = async (req, res) => {
  const { search, category } = req.query;

  try {
    const whereClause = {};

    if (search) {
      whereClause.name = {
        startsWith: search,
        mode: "insensitive",
      };
    }

    if (category) {
      whereClause.category = category;
    }

    const attribute = await prisma.attribute.findMany({
      where: whereClause,
      include: { options: true },
      orderBy: { name: "asc" },
    });

    res.json({ success: true, data: attributes });
  } catch (error) {
    console.error("Fetch attributes error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch attributes" });
  }
};

const updateAttribute = async (req, res) => {
  const { id } = req.params;

  const { category, name, options } = req.body;

  try {
    const attribute = await prisma.attribute.findUnique({
      where: { id },
      include: { options: true },
    });

    if (!attribute) {
      return res
        .status(404)
        .json({ success: false, message: "Attribute not found" });
    }

    if (name && name !== attribute.name) {
      const existing = await prisma.attribute.findUnique({
        where: { name },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Attribute name must be globally unique",
        });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.attribute.update({
        where: { id },
        data: {
          name: name || attribute.category,
          category: category || attribute.category,
        },
      });

      if (options.length > 0) {
        await tx.attributeOption.createMany({
          data: options.map((opt) => ({
            attributeId: id,
            value: opt.trim(),
          })),
        });
      }
    });

    const updateData = await prisma.attribute.findUnique({
      where: { id },
      include: { options: true },
    });

    res.json({ success: true, data: updatedData });
  } catch (error) {
    console.error("Update attribute error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update attribute" });
  }
};

const deleteAttribute = async (req, res) => {
  const { id } = req.params;

  try {
    const attribute = await prisma.attribute.findUnique({
      where: { id },
    });

    if (!attribute) {
      return res
        .status(404)
        .json({ success: false, message: "Attribute not found" });
    }

    await prisma.attribute.delete({
      where: { id },
    });

    res.json({ success: true, message: "Attribute deleted successfully" });
  } catch (error) {
    console.error("Delete attribute error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete attribute" });
  }
};

export { createAttribute, getAttributes, updateAttribute, deleteAttribute };
