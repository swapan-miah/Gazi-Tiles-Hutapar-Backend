// src/routes/saleRoutes.ts
import express, { Request, Response } from "express";
import { z } from "zod";
import { Sale } from "../models/sale.model";
import { Store } from "../models/store.model";
import { Invoice } from "../models/invoice.model";
import mongoose from "mongoose";

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
        store_caton: z.number().min(1),
        store_feet: z.number().min(1),
      })
    )
    .min(1),
  date: z.string().min(1),
  invoice_number: z.number().min(1),
});

saleRoutes.post("/create", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log("🔍 Parsing request body...");
    const parsed = saleSchema.parse(req.body);
    const currentInvoice = parsed.invoice_number;
    console.log("✅ Schema validated:", parsed);

    // ✅ পর্যাপ্ত স্টক আছে কিনা চেক
    console.log("🔍 Checking stock availability...");
    for (const p of parsed.products) {
      const store = await Store.findOne({
        product_code: p.product_code,
      }).session(session);

      if (!store) {
        throw new Error(`Stock not found for product: ${p.product_code}`);
      }

      if (store.caton < p.sell_caton || store.feet < p.sell_feet) {
        throw new Error(`Insufficient stock for ${p.product_code}`);
      }
    }
    console.log("✅ Stock availability confirmed.");

    // ✅ স্টক হালনাগাদ
    console.log("🔄 Updating stock...");
    for (const p of parsed.products) {
      const result = await Store.updateOne(
        { product_code: p.product_code },
        {
          $inc: {
            caton: -p.sell_caton,
            feet: -p.sell_feet,
          },
        },
        { session }
      );
      console.log(`✅ Stock updated for ${p.product_code}`, result);
    }

    // ✅ সেল সেভ
    console.log("💾 Saving sale data...");
    const sale = new Sale(parsed);
    await sale.save({ session });
    console.log("✅ Sale saved.");

    // ✅ ইনভয়েস আপডেট
    console.log("🔢 Updating invoice number...");
    const invoiceResult = await Invoice.updateOne(
      { _id: "68830830b0857da6bf29f920" },
      { $set: { invoice_number: currentInvoice + 1 } },
      { session }
    );
    console.log("✅ Invoice updated", invoiceResult);

    // ✅ ট্রানজেকশন সফলভাবে সম্পন্ন
    await session.commitTransaction();
    session.endSession();
    console.log("✅ Transaction committed.");

    return res.json({
      success: true,
      message: "Sale completed successfully",
      invoice_number: currentInvoice,
    });
  } catch (err: any) {
    await session.abortTransaction();
    session.endSession();
    console.error("❌ Transaction aborted due to error:", err);

    // ✅ Zod validation error
    if (err.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: err.errors?.[0]?.message || "Invalid input",
        errorType: "ValidationError",
      });
    }

    // ✅ Custom stock error or manual error
    if (err instanceof Error && err.message.includes("Insufficient stock")) {
      return res.status(400).json({
        success: false,
        message: err.message,
        errorType: "StockError",
      });
    }

    if (err instanceof Error && err.message.includes("Stock not found")) {
      return res.status(404).json({
        success: false,
        message: err.message,
        errorType: "NotFoundError",
      });
    }

    // ✅ অন্যান্য সার্ভার সাইড error
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message || err,
    });
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
