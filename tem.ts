import express, { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { Purchase } from "../models/purchase.model";
import { Store } from "../models/store.model";
import mongoose from "mongoose";

export const purchaseRoutes = express.Router();

// Zod schema for creating a purchase (used for POST /create)
const purchaseSchema = z.object({
  product_code: z.string().min(1, "Product code is required"),
  company: z.string().min(1, "Company is required"),
  caton: z.number().min(1, "Caton must be at least 1"),
  height: z.number().min(1, "Height must be at least 1"),
  width: z.number().min(1, "Width must be at least 1"),
  per_caton_to_pcs: z.number().min(1, "Per caton to pcs must be at least 1"),
  date: z.string().min(1, "Date is required"),
});

// Zod schema for updating a purchase (all fields are optional for partial updates)
const updatePurchaseSchema = z.object({
  product_code: z.string().min(1, "Product code is required").optional(),
  company: z.string().min(1, "Company is required").optional(),
  caton: z.number().min(1, "Caton must be at least 1").optional(),
  height: z.number().min(1, "Height must be at least 1").optional(),
  width: z.number().min(1, "Width must be at least 1").optional(),
  per_caton_to_pcs: z.number().min(1, "Per caton to pcs must be at least 1").optional(),
  date: z.string().min(1, "Date is required").optional(),
});

// Helper function to calculate feet from purchase details
const calculateFeet = (height: number, width: number, per_caton_to_pcs: number, caton: number): number => {
  const perCatonToFeet = ((height * width) / 144) * per_caton_to_pcs;
  return perCatonToFeet * caton;
};

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
        height,
        width,
        per_caton_to_pcs,
        date,
      } = parsed.data;

      const feet = calculateFeet(height, width, per_caton_to_pcs, caton);

      // Save Purchase
      const newPurchase = await Purchase.create(
        [
          {
            product_code,
            company,
            caton,
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

// --- PATCH /api/purchase/update/:id ---
purchaseRoutes.patch(
  "/update/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;

      // Validate the incoming request body
      const parsed = updatePurchaseSchema.safeParse(req.body);
      if (!parsed.success) {
        await session.abortTransaction();
        session.endSession();
        const message = parsed.error.issues.map((i) => i.message).join(", ");
        return res.status(400).json({ success: false, message });
      }

      const updateData = parsed.data;

      // Find the existing purchase record
      const existingPurchase = await Purchase.findById(id).session(session);

      if (!existingPurchase) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ success: false, message: "Purchase not found." });
      }

      // Calculate original feet before update
      const originalFeet = calculateFeet(
        existingPurchase.height,
        existingPurchase.width,
        existingPurchase.per_caton_to_pcs,
        existingPurchase.caton
      );

      // Apply updates to the existing purchase document
      // Object.assign ensures that only provided fields are updated
      Object.assign(existingPurchase, updateData);

      // Save the updated purchase
      await existingPurchase.save({ session });

      // Calculate new feet based on the updated purchase data
      const newFeet = calculateFeet(
        existingPurchase.height,
        existingPurchase.width,
        existingPurchase.per_caton_to_pcs,
        existingPurchase.caton
      );

      // Calculate the difference in feet
      const feetDifference = newFeet - originalFeet;

      // Update the corresponding store entry
      const store = await Store.findOne({ product_code: existingPurchase.product_code }).session(session);

      if (store) {
        store.feet += feetDifference; // Adjust feet in store
        await store.save({ session });
      } else {
        // This case should ideally not happen if product_code exists in store from initial purchase.
        // However, if a product code was somehow removed from store or this is a new product code
        // being introduced via update (which your frontend prevents by making it read-only),
        // we might need to create a new store entry or handle this error.
        // For now, we'll log a warning or return an error if a store entry is unexpectedly missing.
        console.warn(`Store entry for product_code ${existingPurchase.product_code} not found during update.`);
        // Optionally, you could create a new store entry here if that's desired behavior.
        // For this scenario, assuming store entry always exists for existing purchases.
      }

      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({
        success: true,
        message: "✅ Purchase updated successfully!",
        data: existingPurchase,
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      next(err); // Pass error to the next middleware (error handler)
    }
  }
);

// --- GET /api/purchase/all ---
purchaseRoutes.get(
  "/all",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const purchases = await Purchase.find({});
      return res.status(200).json({
        success: true,
        message: "✅ Purchases fetched successfully!",
        purchases,
      });
    } catch (err) {
      next(err);
    }
  }
);

// --- GET /api/purchase/:id ---
purchaseRoutes.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const purchase = await Purchase.findById(id);

      if (!purchase) {
        return res.status(404).json({ success: false, message: "Purchase not found." });
      }

      return res.status(200).json({
        success: true,
        message: "✅ Purchase fetched successfully!",
        purchase,
      });
    } catch (err) {
      next(err);
    }
  }
);

// --- DELETE /api/purchase/delete/:id ---
purchaseRoutes.delete(
  "/delete/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;

      const purchaseToDelete = await Purchase.findById(id).session(session);

      if (!purchaseToDelete) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ success: false, message: "Purchase not found." });
      }

      // Calculate the feet to subtract from store
      const feetToRemove = calculateFeet(
        purchaseToDelete.height,
        purchaseToDelete.width,
        purchaseToDelete.per_caton_to_pcs,
        purchaseToDelete.caton
      );

      // Delete the purchase record
      await Purchase.findByIdAndDelete(id, { session });

      // Update the corresponding store entry
      const store = await Store.findOne({ product_code: purchaseToDelete.product_code }).session(session);

      if (store) {
        store.feet -= feetToRemove; // Subtract feet from store
        await store.save({ session });
      } else {
        console.warn(`Store entry for product_code ${purchaseToDelete.product_code} not found during delete.`);
      }

      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({
        success: true,
        message: "✅ Purchase deleted successfully!",
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      next(err);
    }
  }
);
