import { Schema, model, Document } from "mongoose";
import { IUser } from "../interfaces/user.interface";

// Schema definition for AdminUser
const userSchema = new Schema<IUser & Document>(
  {
    userName: {
      type: String,
      required: [true, "User name is required"],
      trim: true,
    },
    userEmail: {
      type: String,
      required: [true, "User email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    userVerify: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["admin"],
      required: true,
      default: "admin",
    },
    role1: {
      type: String,
      enum: ["owner"],
      required: true,
      default: "owner",
    },
  },
  {
    versionKey: false,
    timestamps: true,
    collection: "users", // Ensures correct collection name
  }
);

export const User = model<IUser & Document>("User", userSchema);
