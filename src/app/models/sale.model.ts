import { Schema, model } from "mongoose";
import { ISale } from "../interfaces/sale.interface";

const ProductSchema = new Schema(
  {
    product_code: { type: String, required: true },
    sell_caton: { type: Number, required: true },
    sell_pcs: { type: Number, required: true },
    sell_feet: { type: Number, required: true },
    store_feet: { type: Number, required: true },
    height: { type: Number, required: true },
    width: { type: Number, required: true },
    per_caton_to_pcs: { type: Number, required: true },
  },
  { _id: false } // ✅ prevent _id in products
);

const SaleSchema = new Schema<ISale>({
  products: {
    type: [ProductSchema],
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  invoice_number: {
    type: Number,
    required: true,
  },
});

export const Sale = model<ISale>("Sale", SaleSchema);
