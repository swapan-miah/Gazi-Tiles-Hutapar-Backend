import express, { Request, Response } from "express";
import { z } from "zod";
import { Product } from "../models/product.model";

export const productRoutes = express.Router();

// ✅ Define Zod schema
const productSchema = z.object({
  company: z
    .string()
    .trim()
    .min(1, "Company name is required")
    .transform((val) => val.toLowerCase()),
  product_code: z
    .string()
    .trim()
    .min(1, "Product Code is required")
    .transform((val) => val.toLowerCase()),
  height: z.number().gt(0, "Height must be greater than 0"),
  width: z.number().gt(0, "Width must be greater than 0"),
  per_caton_to_pcs: z.number().gt(0, "Per caton to pcs must be greater than 0"),
});

// ✅ Route to create a new product
productRoutes.post("/create", async (req: Request, res: Response) => {
  const parsed = productSchema.safeParse(req.body);

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => issue.message)
      .join(", ");
    return res.status(400).json({
      success: false,
      message,
    });
  }

  const { product_code } = parsed.data;

  try {
    // ✅ Check for duplicate product
    const existing = await Product.findOne({ product_code });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Product already exists",
      });
    }

    // ✅ Create and save new product
    const newProduct = new Product(parsed.data); // Pass full validated data
    await newProduct.save();

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: newProduct,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate product entry",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// ✅ Update product route with validation
productRoutes.put("/update/:id", async (req: Request, res: Response) => {
  const parsed = productSchema.safeParse(req.body);

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => issue.message)
      .join(", ");
    return res.status(400).json({
      success: false,
      message,
    });
  }

  const { id } = req.params;

  try {
    const updated = await Product.findByIdAndUpdate(id, parsed.data, {
      new: true,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.json({
      success: true,
      message: "Product updated successfully",
      product: updated,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate product entry",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// ✅ Route to get all products
productRoutes.get("/all", async (req: Request, res: Response) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 }); // ✅ এখন কাজ করবে
    return res.status(200).json({
      success: true,
      message: "All products retrieved successfully",
      products,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message,
    });
  }
});
