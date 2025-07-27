import { Schema, model, Document } from "mongoose";
import { ICompany } from "../interfaces/company.interface";

// Schema definition for Company
const companySchema = new Schema<ICompany & Document>(
  {
    company: {
      type: String,
      unique: true,
      required: [true, "Company name is required"],
      trim: true,
      lowercase: true,
    },
  },
  {
    versionKey: false,
    timestamps: true,
    collection: "companies", // plural নাম দিন, এটা MongoDB-এর convension
  }
);

export const Company = model<ICompany & Document>("Company", companySchema);
