import { Schema, model, Document } from "mongoose";
import { IPurchase } from "../interfaces/purchase.interface";

const PurchaseSchema = new Schema<IPurchase>(
  {
    invoice_number: {
      type: String,
      required: [true, "Invoice number is required."], // Custom error message
      trim: true,
    },
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
    feet: {
      type: Number,
      required: [true, "Feet quantity is required."],
      min: [1, "Feet cannot be negative."], // Example of a number validator
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
