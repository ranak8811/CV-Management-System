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
