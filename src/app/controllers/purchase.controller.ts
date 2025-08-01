import express, { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { Purchase } from "../models/purchase.model";
import { Store } from "../models/store.model";
import mongoose from "mongoose";

export const purchaseRoutes = express.Router();

const purchaseSchema = z
  .object({
    product_code: z.string().min(1, "Product code is required"),
    company: z.string().min(1, "Company is required"),
    caton: z.number().min(0, "Caton must be at least 0"),
    pcs: z.number().min(0, "Pcs must be at least 0"),
    height: z.number().min(1, "Height must be at least 1"),
    width: z.number().min(1, "Width must be at least 1"),
    per_caton_to_pcs: z.number().min(1, "Per caton to pcs must be at least 1"),
    date: z.string().min(1, "Date is required"),
  })
  .refine((data) => data.caton > 0 || data.pcs > 0, {
    message: "Either Caton or Pcs must be greater than 0",
    // path: ["caton"], // অথবা চাইলে "pcs" বা [] দিতে পারো
  });

// Helper function to calculate feet from purchase details
const calculateFeet = (
  height: number,
  width: number,
  per_caton_to_pcs: number,
  caton: number,
  pcs: number
): number => {
  const perPcsToFeet = (height * width) / 144;
  const perCatonToFeet = ((height * width) / 144) * per_caton_to_pcs;
  return perCatonToFeet * caton + perPcsToFeet * pcs;
};

// --- PATCH /api/purchase/update/:id ---
purchaseRoutes.patch(
  "/update/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;

      // Validate incoming body
      const parsed = purchaseSchema.safeParse(req.body);
      if (!parsed.success) {
        await session.abortTransaction();
        session.endSession();
        const message = parsed.error.issues.map((i) => i.message).join(", ");
        return res.status(400).json({ success: false, message });
      }

      const updateData = parsed.data;

      // Get previous purchase
      const oldPurchase = await Purchase.findById(id).session(session);
      if (!oldPurchase) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(404)
          .json({ success: false, message: "Purchase not found." });
      }

      const oldFeet = calculateFeet(
        oldPurchase.height,
        oldPurchase.width,
        oldPurchase.per_caton_to_pcs,
        oldPurchase.caton,
        oldPurchase.pcs
      );

      // ==== Case 1: product_code changed ====
      if (
        updateData.product_code &&
        updateData.product_code !== oldPurchase.product_code
      ) {
        // 1. Decrease feet from old store
        const oldStore = await Store.findOne({
          product_code: oldPurchase.product_code,
        }).session(session);
        if (oldStore) {
          oldStore.feet -= oldFeet;
          await oldStore.save({ session });
        }

        // 2. Create new store entry if not exist
        let newStore = await Store.findOne({
          product_code: updateData.product_code,
        }).session(session);
        const newFeet = calculateFeet(
          updateData.height,
          updateData.width,
          updateData.per_caton_to_pcs,
          updateData.caton,
          updateData.pcs
        );

        if (!newStore) {
          newStore = new Store({
            product_code: updateData.product_code,
            company: updateData.company,
            height: updateData.height,
            width: updateData.width,
            per_caton_to_pcs: updateData.per_caton_to_pcs,
            feet: newFeet,
          });
        } else {
          // এটা else হতেই পারবে না।
          newStore.feet += newFeet;
        }

        await newStore.save({ session });

        // 3. Update purchase
        Object.assign(oldPurchase, updateData);
        await oldPurchase.save({ session });
      }

      // ==== Case 2: product_code did NOT change ====
      else {
        // 1. Decrease old feet from store
        const store = await Store.findOne({
          product_code: oldPurchase.product_code,
        }).session(session);
        if (!store) {
          await session.abortTransaction();
          session.endSession();
          return res
            .status(404)
            .json({ success: false, message: "Store not found." });
        }

        store.feet -= oldFeet;

        // 2. Update purchase
        Object.assign(oldPurchase, updateData);
        await oldPurchase.save({ session });

        // 3. Add new feet to store
        const newFeet = calculateFeet(
          oldPurchase.height,
          oldPurchase.width,
          oldPurchase.per_caton_to_pcs,
          oldPurchase.caton,
          oldPurchase.pcs
        );

        store.feet += newFeet;
        await store.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({
        success: true,
        message: "✅ Purchase updated successfully!",
        data: oldPurchase,
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      next(err);
    }
  }
);

// --- POST /api/purchase/create ---
purchaseRoutes.post(
  "/create",
  async (req: Request, res: Response, next: NextFunction) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const parsed = purchaseSchema.safeParse(req.body);
      if (!parsed.success) {
        await session.abortTransaction();
        session.endSession();
        const message = parsed.error.issues.map((i) => i.message).join(", ");
        return res.status(400).json({ success: false, message });
      }

      const {
        product_code,
        company,
        caton,
        pcs,
        height,
        width,
        per_caton_to_pcs,
        date,
      } = parsed.data;

      const feet = calculateFeet(height, width, per_caton_to_pcs, caton, pcs);

      // Save Purchase
      const newPurchase = await Purchase.create(
        [
          {
            product_code,
            company,
            caton,
            pcs,
            height,
            width,
            per_caton_to_pcs,
            date,
          },
        ],
        { session }
      );

      // Update/Create store
      const store = await Store.findOne({ product_code }).session(session);
      if (store) {
        store.feet += feet;
        await store.save({ session });
      } else {
        await Store.create(
          [{ product_code, company, feet, height, width, per_caton_to_pcs }],
          { session }
        );
      }

      await session.commitTransaction();
      session.endSession();

      return res.status(201).json({
        success: true,
        message: "✅ Purchase added successfully!",
        data: newPurchase[0],
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      next(err); // Pass error to the next middleware (error handler)
    }
  }
);

purchaseRoutes.get(
  "/history",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      if (page < 1 || limit < 1) {
        return res.status(400).json({
          success: false,
          message: "Page and limit parameters must be positive integers.",
        });
      }

      const total = await Purchase.countDocuments();
      const purchases = await Purchase.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      res.json({
        success: true,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit), // Added totalPages
        data: purchases,
      });
    } catch (err) {
      next(err); // Pass the error to the centralized error handler
    }
  }
);

purchaseRoutes.get(
  "/group/custom-date",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const date = req.query.date as string;

      if (!date) {
        return res
          .status(400)
          .json({ success: false, message: "Date is required" });
      }

      const results = await Purchase.aggregate([
        {
          $match: {
            date: date,
          },
        },
        {
          $group: {
            _id: "$product_code",
            totalCaton: { $sum: "$caton" },
            totalFeet: { $sum: "$feet" },
            company: { $first: "$company" },
            invoiceNumbers: { $push: "$invoice_number" },
            date: { $first: "$date" },
          },
        },
        {
          $sort: { date: -1 }, // নতুনগুলো উপরে
        },
      ]);

      const formatted = results.map((item) => ({
        product_code: item._id,
        company: item.company,
        total_caton: item.totalCaton,
        total_feet: item.totalFeet,
        invoices: item.invoiceNumbers,
        date: item.date,
      }));

      res.status(200).json({
        success: true,
        count: formatted.length,
        data: formatted,
      });
    } catch (err) {
      next(err); // Central error handler
    }
  }
);

// --- DELETE /api/purchase/:id ---
purchaseRoutes.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;

      const purchase = await Purchase.findById(id).session(session);
      if (!purchase) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(404)
          .json({ success: false, message: "❌ Purchase not found." });
      }

      // 1. Calculate how much feet to reduce from store
      const feetToReduce = calculateFeet(
        purchase.height,
        purchase.width,
        purchase.per_caton_to_pcs,
        purchase.caton,
        purchase.pcs
      );

      // 2. Update store
      const store = await Store.findOne({
        product_code: purchase.product_code,
      }).session(session);

      if (!store) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(404)
          .json({ success: false, message: "❌ Store not found." });
      }

      store.feet -= feetToReduce;
      if (store.feet < 0) store.feet = 0;

      await store.save({ session });

      // 3. Delete purchase
      await Purchase.findByIdAndDelete(id).session(session);

      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({
        success: true,
        message: "🗑️ Purchase deleted successfully!",
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      next(err);
    }
  }
);
