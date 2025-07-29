import express, { Request, Response, NextFunction } from "express";
import { Store } from "../models/store.model";

export const storeRoutes = express.Router();

// ✅ Get All Store Data (No Pagination)
storeRoutes.get(
  "/all",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const allStores = await Store.find().sort({ product_code: 1 }); // Optional: sort alphabetically
      res.status(200).json({
        success: true,
        total: allStores.length,
        data: allStores,
      });
    } catch (err) {
      next(err); // Centralized error handler will handle it
    }
  }
);
storeRoutes.get(
  "/in-stock/all",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const allStores = await Store.find({ feet: { $gt: 0 } }).sort({
        product_code: 1,
      });
      res.status(200).json({
        success: true,
        total: allStores.length,
        data: allStores,
      });
    } catch (err) {
      next(err);
    }
  }
);

storeRoutes.get("/get-by-code/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const store = await Store.findOne({ product_code: code });
    if (!store) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found in store." });
    }
    res.json({ success: true, data: store });
  } catch (err) {
    res.status(500).json({ success: false, message: "Something went wrong." });
  }
});
