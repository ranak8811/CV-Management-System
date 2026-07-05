import { useId } from "react";
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
      where: { userId_attributeId: { userId, attributeId: attr.id } },
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
    await ensureBuiltInAttributes(useId);

    const user = await prisma.user.findUnique({
      where: { id: useId },
      select: { id: true, email: true, name: true, role: true, version: true },
    });

    const attributeValues = await prisma.userAttributeValue.findMany({
      where: { userId },
      include: {
        attribute: { include: { options: true } },
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
    return res.status(400).json({
      success: false,
      message: "AttributeId, value, and version are required",
    });
  }

  try {
    const updateUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: useId },
      });

      if (!user || user.version !== Number(version)) {
        throw new Error("VersionConflict");
      }

      await tx.userAttributeValue.upsert({
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

      const updated = await tx.user.update({
        where: { id: useId },
        data: {
          version: { increment: 1 },
        },
        select: { version: true },
      });

      return updated;
    });

    res.json({ success: true, newVersion: updateUser.version });
  } catch (error) {
    if (error.message === "VersionConflict") {
      return res.status(409).json({
        success: false,
        message:
          "Conflict: Profile has been updated from another session. Please refresh.",
      });
    }
    console.error("Save profile attribute error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to save attribute value" });
  }
};
