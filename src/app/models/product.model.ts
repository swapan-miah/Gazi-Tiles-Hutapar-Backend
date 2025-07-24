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
      unique: true,
      required: [true, "Product Code is required"],
      trim: true,
      lowercase: true,
    },
  },
  {
    versionKey: false,
    timestamps: false,
    collection: "products", // plural নাম দিন, এটা MongoDB-এর convension
  }
);

export const Product = model<IProduct & Document>("Product", productSchema);
