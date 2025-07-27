import { Schema, model, Document } from "mongoose";
import { IProduct } from "../interfaces/product.interface";

// Schema definition for Company
const productSchema = new Schema<IProduct & Document>(
  {
    company: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      lowercase: true,
    },
    product_code: {
      type: String,
      unique: [true, "Product Code must be unique"],
      required: [true, "Product Code is required"],
      trim: true,
      lowercase: true,
    },
    height: {
      type: Number,
      required: [true, "Height  is required"],
    },
    width: {
      type: Number,
      required: [true, "Width  is required"],
    },
    per_caton_to_pcs: {
      type: Number,
      required: [true, "Per caton to pcs is required"],
    },
  },
  {
    versionKey: false,
    timestamps: true,
    collection: "products", // plural নাম দিন, এটা MongoDB-এর convension
  }
);

export const Product = model<IProduct & Document>("Product", productSchema);
