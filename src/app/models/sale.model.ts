// src/models/sale.model.ts
import { Schema, model } from "mongoose";
import { ISale } from "../interfaces/sale.interface";

const SaleSchema = new Schema<ISale>({
  customer: {
    name: String,
    address: String,
    mobile: String,
  },
  products: [
    {
      product_code: String,
      sell_caton: Number,
      sell_feet: Number,
    },
  ],
  date: {
    type: String,
    required: true,
  },
});

export const Sale = model<ISale>("Sale", SaleSchema);
