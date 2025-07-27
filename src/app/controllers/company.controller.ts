import express, { Request, Response } from "express";
import { z } from "zod";
import { Company } from "../models/company.model";

export const companyRoutes = express.Router();

// ✅ Define Zod schema
const companySchema = z.object({
  company: z.string().min(1, "Company name is required"),
});

// Get all companies
companyRoutes.get("/all", async (req: Request, res: Response) => {
  try {
    const companies = await Company.find({}).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "All companies retrieved successfully",
      companies,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// ✅ Route to create a new company
companyRoutes.post("/create", async (req: Request, res: Response) => {
  // ✅ Zod validation
  const parsed = companySchema.safeParse(req.body);

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => issue.message)
      .join(", ");
    return res.status(400).json({
      success: false,
      message,
    });
  }

  const { company } = parsed.data;

  try {
    // ✅ Check for duplicate company
    const existing = await Company.findOne({ company });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Company already exists",
      });
    }

    // ✅ Create new company
    const newCompany = new Company({ company });
    await newCompany.save();

    return res.status(201).json({
      success: true,
      message: "Company created successfully",
      company: newCompany,
    });
  } catch (error: any) {
    // ✅ Handle duplicate key error from MongoDB
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate company entry",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Delete a company by name
companyRoutes.delete(
  "/delete/:company",
  async (req: Request, res: Response) => {
    try {
      const companyName = req.params.company;
      const deleted = await Company.findOneAndDelete({ company: companyName });
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Company not found",
        });
      }
      res.status(200).json({
        success: true,
        message: "Company deleted successfully",
        company: deleted,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
);

// Get single company by name
companyRoutes.get("/company/:company", async (req: Request, res: Response) => {
  try {
    const companyName = req.params.company;
    const company = await Company.findOne({ company: companyName });
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Company retrieved successfully",
      company,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

