import express, { Request, Response } from "express";
import { Guide } from "../models/guide.model";

export const guideRoutes = express.Router();

// Get latest video link
guideRoutes.get("/video-link", async (req: Request, res: Response) => {
  try {
    const latestGuide = await Guide.findOne({}).sort({ createdAt: -1 });

    if (!latestGuide) {
      return res.status(404).json({
        success: false,
        message: "No video guide found",
      });
    }

    res.status(200).json({
      success: true,
      video_link: latestGuide.video_link,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});
