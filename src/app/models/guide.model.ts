import { Schema, model, Document } from "mongoose";
import { IGuide } from "../interfaces/guide.interface";

const guideSchema = new Schema<IGuide & Document>(
  {
    video_link: {
      type: String,
      unique: true,
      required: [true, "Video Link is required"],
      trim: true,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

export const Guide = model<IGuide & Document>("Guide", guideSchema);
