import express, { Request, Response, NextFunction } from "express";
import { Purchase } from "../models/purchase.model";
import { Store } from "../models/store.model";

export const purchaseRoutes = express.Router();

// POST /purchase/create
purchaseRoutes.post(
  "/create",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { product_code, company, caton, feet, invoice_number, date } =
        req.body;

      // ✅ 1. Input Validation
      if (
        !product_code ||
        !company ||
        !caton ||
        !feet ||
        !invoice_number ||
        !date
      ) {
        return res.status(400).json({
          success: false,
          message: "All fields are required.",
        });
      }

      if (caton < 1 || feet < 1) {
        return res.status(400).json({
          success: false,
          message: "Caton and feet must be greater than 0.",
        });
      }

      // ✅ 2. Duplicate Purchase Check
      const exists = await Purchase.findOne({ product_code, invoice_number });
      if (exists) {
        return res.status(409).json({
          success: false,
          message:
            "A purchase with this product code and invoice number already exists.",
        });
      }

      // ✅ 3. Save Purchase
      const newPurchase = await Purchase.create({
        product_code,
        company,
        caton,
        feet,
        invoice_number,
        date,
      });

      // ✅ 4. Update or Create Store
      const store = await Store.findOne({ product_code, company });

      if (store) {
        // ➕ Update stock
        store.caton += caton;
        store.feet += feet;
        await store.save();
      } else {
        // 🆕 Create new stock
        await Store.create({
          product_code,
          company,
          caton,
          feet,
        });
      }

      return res.status(201).json({
        success: true,
        message: "Purchase added and store updated.",
        data: newPurchase,
      });
    } catch (err) {
      next(err);
    }
  }
);

purchaseRoutes.get(
  // Changed to GET as it's fetching data
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
