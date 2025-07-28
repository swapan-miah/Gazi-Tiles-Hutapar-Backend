// src/models/Store.model.ts
import { Schema, model, Document } from "mongoose";
import { IStore } from "../interfaces/store.interface";

const StoreSchema = new Schema<IStore>({
  product_code: { type: String, required: true, unique: true },
  company: { type: String, required: true },
  feet: { type: Number, default: 0 },
  height: { type: Number, default: 0 },
  width: { type: Number, default: 0 },
  per_caton_to_pcs: { type: Number, default: 0 },
});

export const Store = model<IStore>("Store", StoreSchema);
