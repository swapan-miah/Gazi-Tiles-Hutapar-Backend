// src/routes/saleRoutes.ts
import express, { Request, Response } from "express";
import { z } from "zod";
import { Sale } from "../models/sale.model";
import { Store } from "../models/store.model";
import { Invoice } from "../models/invoice.model";
import mongoose from "mongoose";

export const saleRoutes = express.Router();

const saleSchema = z.object({
  invoice_number: z.number().min(1),
  date: z.string().min(1),
  products: z
    .array(
      z
        .object({
          product_code: z.string().min(1),
          sell_caton: z.number().min(0),
          sell_pcs: z.number().min(0),
          sell_feet: z.number().min(0.1),
          store_feet: z.number().min(0.1),
          height: z.number().min(1),
          width: z.number().min(1),
          per_caton_to_pcs: z.number().min(1),
        })
        .refine((data) => data.sell_caton > 0 || data.sell_pcs > 0, {
          message:
            "sell_caton এবং sell_pcs এর মধ্যে অন্তত একটি ০ এর বেশি হতে হবে।",
          path: ["sell_caton"], // বা "products" বাদেও করা যায়
        })
    )
    .min(1),
});

saleRoutes.post("/create", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const parsed = saleSchema.parse(req.body);
    const invoiceNum = parsed.invoice_number;

    // স্টক যাচাই
    for (const p of parsed.products) {
      const store = await Store.findOne({
        product_code: p.product_code,
      }).session(session);
      if (!store)
        throw new Error(`Stock not found for product ${p.product_code}`);

      if (store.feet + 0.3 < p.sell_feet) {
        throw new Error(`Insufficient feet for ${p.product_code}`);
      }
    }

    // স্টক আপডেট করা
    for (const p of parsed.products) {
      const store = await Store.findOne({
        product_code: p.product_code,
      }).session(session);
      if (!store)
        throw new Error(`Stock not found for product ${p.product_code}`);

      const updatedFeet = store.feet - p.sell_feet;
      const newFeet = updatedFeet < 0 ? 0 : updatedFeet;

      await Store.updateOne(
        { product_code: p.product_code },
        { $set: { feet: newFeet } },
        { session }
      );
    }

    // সেল সেভ করা
    const sale = new Sale(parsed);
    await sale.save({ session });

    // ইনভয়েস আপডেট
    await Invoice.updateOne(
      { _id: "68830830b0857da6bf29f920" },
      { $set: { invoice_number: invoiceNum + 1 } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.json({ success: true, invoice_number: invoiceNum });
  } catch (err: any) {
    await session.abortTransaction();
    session.endSession();

    if (err?.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: err.errors[0]?.message,
        errorType: "ValidationError",
      });
    }
    if (err instanceof Error && err.message.includes("Insufficient")) {
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

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message ?? err,
    });
  }
});

saleRoutes.get("/", async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const total = await Sale.countDocuments();

  const sales = await Sale.find()
    .sort({ invoice_number: -1 }) // sort by invoice_number descending
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
          total_pcs: { $sum: "$products.sell_pcs" },
        },
      },
      {
        $project: {
          _id: 0,
          product_code: "$_id.product_code",
          date: "$_id.date",
          total_caton: 1,
          total_feet: 1,
          total_pcs: 1,
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

// GET /api/sale/:id
saleRoutes.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const sale = await Sale.findById(id);

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    return res.status(200).json(sale);
  } catch (error) {
    console.error("Error fetching sale:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

saleRoutes.put("/update/:id", async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params; // বিক্রয়ের ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid Sale ID");
    }

    const parsed = saleSchema.parse(req.body); // ফ্রন্টএন্ড থেকে আসা নতুন ডেটা

    // ১. বিদ্যমান বিক্রয় ডেটা লোড করা
    const originalSale = await Sale.findById(id).session(session);
    if (!originalSale) {
      throw new Error("Sale not found for update");
    }

    // ২. পূর্ববর্তী বিক্রয়ের পণ্যগুলি স্টকে ফিরিয়ে দেওয়া
    for (const originalProduct of originalSale.products) {
      const store = await Store.findOne({
        product_code: originalProduct.product_code,
      }).session(session);

      if (store) {
        // স্টকে পণ্য থাকলে, পূর্বে বিক্রি হওয়া ফিট ফেরত দিন
        const newFeet = store.feet + originalProduct.sell_feet;
        await Store.updateOne(
          { product_code: originalProduct.product_code },
          { $set: { feet: newFeet } },
          { session }
        );
      }
      // যদি স্টোর এ না থাকে, তাহলে এটি একটি সমস্যা, কিন্তু আপডেটের জন্য আমরা এগিয়ে যাব
      // কারণ পণ্যটি হয়তো মুছে ফেলা হয়েছে বা অন্য কোনো কারণে নেই।
    }

    // ৩. নতুন ডেটার উপর ভিত্তি করে স্টক পর্যাপ্ততা যাচাই এবং আপডেট করা
    for (const newProduct of parsed.products) {
      const store = await Store.findOne({
        product_code: newProduct.product_code,
      }).session(session);

      if (!store) {
        throw new Error(
          `Stock not found for product ${newProduct.product_code}`
        );
      }

      // স্টোরের ফিট এর সাথে 0.3 যোগ করে পর্যাপ্ততা যাচাই
      if (store.feet + 0.3 < newProduct.sell_feet) {
        throw new Error(
          `Insufficient feet for ${
            newProduct.product_code
          } (Available: ${store.feet.toFixed(2)} feet)`
        );
      }

      // স্টক থেকে নতুন বিক্রয়কৃত পরিমাণ বিয়োগ করা
      const updatedFeet = store.feet - newProduct.sell_feet;
      const finalFeet = updatedFeet < 0 ? 0 : updatedFeet; // স্টক ঋণাত্মক হতে পারবে না

      await Store.updateOne(
        { product_code: newProduct.product_code },
        { $set: { feet: finalFeet } },
        { session }
      );
    }

    // ৪. সেল ডকুমেন্ট আপডেট করা
    const updatedSale = await Sale.findByIdAndUpdate(
      id,
      { $set: parsed }, // নতুন ডেটা দিয়ে আপডেট
      { new: true, session } // updated document ফেরত দিন
    );

    if (!updatedSale) {
      throw new Error("Failed to update sale document.");
    }

    await session.commitTransaction();
    session.endSession();

    return res.json({
      success: true,
      message: "Sale updated successfully",
      sale: updatedSale,
    });
  } catch (err: any) {
    await session.abortTransaction();
    session.endSession();

    if (err?.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: err.errors[0]?.message,
        errorType: "ValidationError",
      });
    }
    if (err instanceof Error && err.message.includes("Insufficient")) {
      return res.status(400).json({
        success: false,
        message: err.message,
        errorType: "StockError",
      });
    }
    if (err instanceof Error && err.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        message: err.message,
        errorType: "NotFoundError",
      });
    }
    if (err instanceof Error && err.message.includes("Invalid Sale ID")) {
      return res.status(400).json({
        success: false,
        message: err.message,
        errorType: "InvalidInputError",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message ?? err,
    });
  }
});
