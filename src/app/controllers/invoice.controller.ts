import express, { Request, Response } from "express";
import { z } from "zod";
import { Invoice } from "../models/invoice.model";

export const invoiceRoutes = express.Router();

// ✅ Route to get all products
invoiceRoutes.get("/next-invoice", async (req: Request, res: Response) => {
  try {
    const invoice = await Invoice.findById("68830830b0857da6bf29f920").select(
      "invoice_number"
    );

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Invoice number retrieved successfully",
      invoice_number: invoice.invoice_number,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch invoice",
      error: error.message,
    });
  }
});
