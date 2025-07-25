// src/models/sale.model.ts
import { Schema, model } from "mongoose";
import { ISale } from "../interfaces/sale.interface";

const SaleSchema = new Schema<ISale>({
  customer: {
    name: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    mobile: {
      type: String,
      required: true,
    },
  },
  products: [
    {
      product_code: {
        type: String,
        required: true,
      },
      sell_caton: {
        type: Number,
        required: true,
      },
      sell_feet: {
        type: Number,
        required: true,
      },
      store_caton: {
        type: Number,
        required: true,
      },
      store_feet: {
        type: Number,
        required: true,
      },
    },
  ],
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
