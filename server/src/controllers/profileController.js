import { prisma } from "../config/db.js";

const BUILT_IN_ATTRIBUTES = [
  { name: "First Name", category: "Personal Information", type: "STRING" },
  { name: "Last Name", category: "Personal Information", type: "STRING" },
  { name: "Location", category: "Personal Information", type: "STRING" },
  { name: "Personal Photo", category: "Personal Information", type: "IMAGE" },
];

const ensureBuiltInAttributes = async (userId) => {
  const createdAttributes = [];

  for (const item of BUILT_IN_ATTRIBUTES) {
    let attr = await prisma.attribute.findUnique({
      where: { name: item.name },
    });

    if (!attr) {
      attr = await prisma.attribute.create({
        data: item,
      });
    }
    createdAttributes.push(attr);

    const userVal = await prisma.userAttributeValue.findUnique({
      where: {
        userId_attributeId: {
          userId,
          attributeId: attr.id,
        },
      },
    });

    if (!userVal) {
      await prisma.userAttributeValue.create({
        data: {
          userId,
          attributeId: attr.id,
          value: "",
        },
      });
    }
  }
  return createdAttributes;
};

const getProfile = async (req, res) => {
  const userId = req.user.id;

  try {
    await ensureBuiltInAttributes(userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, version: true },
    });

    const attributeValues = await prisma.userAttributeValue.findMany({
      where: { userId },
      include: {
        attribute: {
          include: { options: true },
        },
      },
    });

    res.json({
      success: true,
      data: {
        user,
        attributes: attributeValues,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to retrieve profile data" });
  }
};

const saveProfileAttribute = async (req, res) => {
  const userId = req.user.id;
  const { attributeId, value, version } = req.body;

  if (!attributeId || value === undefined || version === undefined) {
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

    await prisma.userAttributeValue.upsert({
      where: {
        userId_attributeId: {
          userId,
          attributeId,
        },
      },
      update: { value: String(value) },
      create: {
        userId,
        attributeId,
        value: String(value),
      },
    });

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        version: { increment: 1 },
      },
      select: { version: true },
    });

    res.json({ success: true, newVersion: updatedUser.version });
  } catch (error) {
    console.error("Save profile attribute error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to save attribute value" });
  }
};

const addProfileAttribute = async (req, res) => {
  const userId = req.user.id;
  const { attributeId, version } = req.body;

  if (!attributeId || version === undefined) {
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

    const existingValue = await prisma.userAttributeValue.findUnique({
      where: {
        userId_attributeId: {
          userId,
          attributeId,
        },
      },
    });

    if (existingValue) {
      return res
        .status(400)
        .json({ success: false, message: "Attribute already added" });
    }

    await prisma.userAttributeValue.create({
      data: {
        userId,
        attributeId,
        value: "",
      },
    });

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        version: { increment: 1 },
      },
      select: { version: true },
    });

    res.json({ success: true, newVersion: updatedUser.version });
  } catch (error) {
    console.error("Add profile attribute error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to add attribute" });
  }
};

const removeProfileAttribute = async (req, res) => {
  const userId = req.user.id;
  const { attributeId, version } = req.body;

  if (!attributeId || version === undefined) {
    return res
      .status(400)
      .json({ success: false, message: "Required fields missing" });
  }

  try {
    const attribute = await prisma.attribute.findUnique({
      where: { id: attributeId },
    });

    if (attribute && BUILT_IN_ATTRIBUTES.some((b) => b.name === attribute.name)) {
      return res
        .status(400)
        .json({ success: false, message: "Cannot remove built-in attributes" });
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

    await prisma.userAttributeValue.delete({
      where: {
        userId_attributeId: {
          userId,
          attributeId,
        },
      },
    });

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        version: { increment: 1 },
      },
      select: { version: true },
    });

    res.json({ success: true, newVersion: updatedUser.version });
  } catch (error) {
    console.error("Remove profile attribute error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to remove attribute" });
  }
};

export {
  getProfile,
  saveProfileAttribute,
  addProfileAttribute,
  removeProfileAttribute,
};
