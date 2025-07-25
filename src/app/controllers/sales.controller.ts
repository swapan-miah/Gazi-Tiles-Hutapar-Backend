// src/routes/saleRoutes.ts
import express, { Request, Response } from "express";
import { z } from "zod";
import { Sale } from "../models/sale.model";
import { Store } from "../models/store.model";

export const saleRoutes = express.Router();

const saleSchema = z.object({
  customer: z.object({
    name: z.string().min(1),
    address: z.string().min(1),
    mobile: z.string().min(1),
  }),
  products: z
    .array(
      z.object({
        product_code: z.string().min(1),
        sell_caton: z.number().min(1),
        sell_feet: z.number().min(1),
      })
    )
    .min(1),
  date: z.string().min(1),
});

saleRoutes.post("/create", async (req, res) => {
  try {
    const parsed = saleSchema.parse(req.body);

    for (const p of parsed.products) {
      const store = await Store.findOne({ product_code: p.product_code });
      if (!store || store.caton < p.sell_caton || store.feet < p.sell_feet) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${p.product_code}`,
        });
      }
    }

    await Promise.all(
      parsed.products.map((p) =>
        Store.updateOne(
          { product_code: p.product_code },
          {
            $inc: {
              caton: -p.sell_caton,
              feet: -p.sell_feet,
            },
          }
        )
      )
    );

    const sale = new Sale(parsed);
    await sale.save();
    res.json({ success: true, message: "Sale saved" });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return res
        .status(400)
        .json({ success: false, message: err.errors[0]?.message });
    }
    res.status(500).json({ success: false, message: "Server error" });
  }
});

saleRoutes.get("/", async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const total = await Sale.countDocuments();
  const sales = await Sale.find()
    .sort({ createdAt: -1 }) // descending order
    .skip((page - 1) * limit)
    .limit(limit);

  res.json({
    success: true,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    sales,
  });
});
saleRoutes.get("/group/custom-date", async (req: Request, res: Response) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res
        .status(400)
        .json({ success: false, message: "Date is required" });
    }

    const groupedData = await Sale.aggregate([
      {
        $match: {
          date: date,
        },
      },
      {
        $unwind: "$products",
      },
      {
        $group: {
          _id: {
            product_code: "$products.product_code",
            date: "$date",
          },
          total_caton: { $sum: "$products.sell_caton" },
          total_feet: { $sum: "$products.sell_feet" },
        },
      },
      {
        $project: {
          _id: 0,
          product_code: "$_id.product_code",
          date: "$_id.date",
          total_caton: 1,
          total_feet: 1,
        },
      },
      {
        $sort: { product_code: 1 },
      },
    ]);

    res.json({
      success: true,
      count: groupedData.length,
      data: groupedData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error", error });
  }
});
