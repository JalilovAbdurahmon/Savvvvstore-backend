import mongoose from "mongoose";
import { CATEGORY_KEYS } from "../utils/categories.js";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sizes: { type: [String], required: true, default: [] }, // masalan ["S","M","L"]
    price: { type: Number, required: true, min: 0 },
    image: { type: String, required: true }, // /uploads/xxx.jpg
    description: { type: String, default: "" },
    category: {
      type: String,
      required: true,
      enum: CATEGORY_KEYS, // clothes | pants | tshirts | shoes | shorts | others
      default: "others",
    },
    isActive: { type: Boolean, default: true }, // miniapp'da ko'rinish/yo'qligi
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);
