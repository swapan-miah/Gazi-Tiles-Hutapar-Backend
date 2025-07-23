import { Server } from "http";
import mongoose from "mongoose";
import app from "./app";
import cors from "cors";

import dotenv from "dotenv";
dotenv.config();

let server: Server;

app.use(cors());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI as string;
console.log("mongo url ", MONGO_URI);

async function main() {
  try {
    if (!MONGO_URI) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB Using Mongoose!!");
    server = app.listen(PORT, () => {
      console.log(`App is listening on port ${PORT}`);
    });
  } catch (error) {
    console.log(error);
  }
}

main();
