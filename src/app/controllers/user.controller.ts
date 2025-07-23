import express, { Request, Response, Application } from "express";
import { User } from "../models/user.model";

export const usersRoutes = express.Router();

// Get user by email
usersRoutes.get("/email/:userEmail", async (req: Request, res: Response) => {
  try {
    const userEmail = req.params.userEmail;
    const user = await User.findOne({ userEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      role: user.role, // এই লাইন যোগ করুন
      user,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});
