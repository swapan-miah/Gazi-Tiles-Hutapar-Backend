import { Schema, model, Document } from "mongoose";
import { IPurchase } from "../interfaces/purchase.interface";

const PurchaseSchema = new Schema<IPurchase>(
  {
    product_code: {
      type: String,
      required: [true, "Product code is required."],
      trim: true,
    },
    company: {
      type: String,
      required: [true, "Company is required."],
      trim: true,
    },
    caton: {
      type: Number,
      required: [true, "Caton quantity is required."],
      min: [1, "Caton cannot be negative."], // Example of a number validator
    },
    height: {
      type: Number,
      required: [true, "Height is required."],
      min: [1, "Hight cannot be negative."], // Example of a number validator
    },
    width: {
      type: Number,
      required: [true, "Weight is required."],
      min: [1, "Wight cannot be negative."], // Example of a number validator
    },
    per_caton_to_pcs: {
      type: Number,
      required: [true, "per caton to pcs  is required."],
      min: [1, "per caton to pcs cannot be negative."], // Example of a number validator
    },
    date: {
      type: String, // Consider using Date type if you plan to do date operations
      required: [true, "Date is required."],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Purchase = model<IPurchase>("Purchase", PurchaseSchema);
