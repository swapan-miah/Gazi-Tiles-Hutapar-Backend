import express, { Request, Response } from "express";
import { z } from "zod";
import { Product } from "../models/product.model";

export const productRoutes = express.Router();

// ✅ Define Zod schema
const productSchema = z.object({
  company: z.string().min(1, "Company name is required"),
  product_code: z.string().min(1, "Product code is required"),
});

// ✅ Route to create a new product
productRoutes.post("/create", async (req: Request, res: Response) => {
  // ✅ Zod validation
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

  const { company, product_code } = parsed.data;

  try {
    // ✅ Check for duplicate product by product_code
    const existing = await Product.findOne({ product_code });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Product already exists",
      });
    }

    // ✅ Create new product
    const newProduct = new Product({ company, product_code });
    await newProduct.save();

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: newProduct,
    });
  } catch (error: any) {
    // ✅ Handle duplicate key error from MongoDB
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
    const products = await Product.find().sort({ createdAt: -1 }); // সর্বশেষ প্রোডাক্ট আগে দেখাতে চাইলে
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
