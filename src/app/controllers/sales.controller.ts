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

saleRoutes.post("/create", async (req: Request, res: Response) => {
  try {
    const result = saleSchema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .json({ success: false, errors: result.error.flatten().fieldErrors });
    }

    const { customer, products, date } = result.data;

    // Check & update stock
    for (const product of products) {
      const storeItem = await Store.findOne({
        product_code: product.product_code,
      });
      if (!storeItem) {
        return res.status(404).json({
          success: false,
          message: `Product ${product.product_code} not found in store.`,
        });
      }

      if (
        product.sell_caton > storeItem.caton ||
        product.sell_feet > storeItem.feet
      ) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.product_code}.`,
        });
      }

      // Reduce stock
      storeItem.caton -= product.sell_caton;
      storeItem.feet -= product.sell_feet;
      await storeItem.save();
    }

    // Save Sale
    const sale = await Sale.create({ customer, products, date });

    res.status(201).json({
      success: true,
      message: "Sale recorded successfully",
      data: sale,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});
