import crypto from "crypto";
import { prisma } from "../config/db.js";

const generateOdooToken = async (req, res) => {
  const { id } = req.params;

  try {
    const position = await prisma.position.findUnique({ where: { id } });

    if (!position) {
      return res
        .status(404)
        .json({ success: false, message: "Position not found" });
    }

    const token =
      position.odooToken ||
      `odoo_tok_${crypto.randomBytes(16).toString("hex")}`;

    const updated = await prisma.position.update({
      where: { id },
      data: { odooToken: token },
    });

    res.json({
      success: true,
      message: "Odoo API Token generated successfully",
      odooToken: updated.odooToken,
    });
  } catch (error) {
    console.error("Generate Odoo Token error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to generate Odoo Token" });
  }
};

const exportOdooData = async (req, res) => {
  const { token } = req.query;

  if (!token || typeof token !== "string") {
    return res
      .status(400)
      .json({
        success: false,
        message: "API token query parameter is required",
      });
  }

  try {
    const position = await prisma.position.findUnique({
      where: { odooToken: token },
      include: {
        positionAttributes: {
          include: { attribute: true },
        },
        cvs: {
          include: {
            candidate: {
              include: {
                userAttributes: {
                  include: { attribute: true },
                },
              },
            },
          },
        },
      },
    });

    if (!position) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid or expired Odoo API token" });
    }

    const totalSubmittedCVs = position.cvs.length;

    const fields = position.positionAttributes.map((pa) => ({
      id: pa.attribute.id,
      title: pa.attribute.name,
      category: pa.attribute.category,
      type: pa.attribute.type,
    }));

    const aggregatedResults = {};

    fields.forEach((field) => {
      const rawValues = [];
      position.cvs.forEach((cv) => {
        const uValObj = cv.candidate.userAttributes?.find(
          (ua) => ua.attributeId === field.id,
        );
        if (uValObj && uValObj.value !== undefined && uValObj.value !== "") {
          rawValues.push(uValObj.value);
        }
      });

      if (field.type === "NUMERIC") {
        const numValues = rawValues
          .map((v) => Number(v))
          .filter((v) => !isNaN(v));

        if (numValues.length > 0) {
          const sum = numValues.reduce((acc, curr) => acc + curr, 0);
          const min = Math.min(...numValues);
          const max = Math.max(...numValues);
          const average = Number((sum / numValues.length).toFixed(2));

          aggregatedResults[field.title] = {
            type: "NUMERIC",
            totalResponses: numValues.length,
            average,
            min,
            max,
          };
        } else {
          aggregatedResults[field.title] = {
            type: "NUMERIC",
            totalResponses: 0,
            average: 0,
            min: 0,
            max: 0,
          };
        }
      } else if (field.type === "BOOLEAN") {
        const trueCount = rawValues.filter((v) => v === "true").length;
        const falseCount = rawValues.filter((v) => v === "false").length;

        aggregatedResults[field.title] = {
          type: "BOOLEAN",
          totalResponses: rawValues.length,
          trueCount,
          falseCount,
        };
      } else {
        const frequencyMap = {};
        rawValues.forEach((v) => {
          const trimmed = v.trim();
          if (trimmed) {
            frequencyMap[trimmed] = (frequencyMap[trimmed] || 0) + 1;
          }
        });

        const sortedValues = Object.keys(frequencyMap).sort(
          (a, b) => frequencyMap[b] - frequencyMap[a],
        );

        aggregatedResults[field.title] = {
          type: field.type,
          totalResponses: rawValues.length,
          mostPopular: sortedValues.slice(0, 5),
          frequencyDistribution: frequencyMap,
        };
      }
    });

    res.json({
      success: true,
      data: {
        inventoryTitle: position.title,
        description: position.description,
        isPublic: position.isPublic,
        maxProjects: position.maxProjects,
        projectTags: position.projectTags,
        totalSubmittedCVs,
        fields,
        aggregatedResults,
      },
    });
  } catch (error) {
    console.error("Export Odoo Data error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to export data for Odoo" });
  }
};

const importItemFromOdoo = async (req, res) => {
  const { title, description, projectTags, maxProjects } = req.body;

  if (!title || !description) {
    return res
      .status(400)
      .json({ success: false, message: "Title and description are required" });
  }

  try {
    const cryptoToken = `odoo_tok_${crypto.randomBytes(16).toString("hex")}`;
    const tagsArray = Array.isArray(projectTags)
      ? projectTags
      : typeof projectTags === "string"
      ? projectTags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const newPosition = await prisma.position.create({
      data: {
        title,
        description,
        projectTags: tagsArray,
        maxProjects: Number(maxProjects) || 3,
        odooToken: cryptoToken,
        isPublic: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Item created in CV System from Odoo successfully",
      data: newPosition,
    });
  } catch (error) {
    console.error("Import item from Odoo error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create item from Odoo" });
  }
};

export { generateOdooToken, exportOdooData, importItemFromOdoo };
