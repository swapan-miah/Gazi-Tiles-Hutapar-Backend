import { Schema, model, Document } from "mongoose";
import { IInvoice } from "../interfaces/invoice.interface";

// Schema definition for Company
const invoiceSchema = new Schema<IInvoice & Document>(
  {
    invoice_number: {
      type: Number,
      required: [true, "Invoice Number is required"],
      unique: true,
    },
  },
  {
    versionKey: false,
    timestamps: false,
  }
);

export const Invoice = model<IInvoice & Document>("Invoice", invoiceSchema);
