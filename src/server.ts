import { Server } from "http";
import mongoose from "mongoose";
import app from "./app";

import dotenv from "dotenv";
dotenv.config();

let server: Server;

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
console.log("mongo url ", MONGO_URI);

async function main() {
  try {
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
