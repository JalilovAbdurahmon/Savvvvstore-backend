import mongoose from "mongoose";
import { CATEGORY_KEYS } from "../utils/categories.js";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sizes: { type: [String], required: true, default: [] }, // masalan ["S","M","L"]
    price: { type: Number, required: true, min: 0 },
    image: { type: String, required: true }, // "/uploads/xxx.jpg"
    images: {
      type: [String], // ["/uploads/xxx.jpg", "/uploads/yyy.jpg", ...]
      validate: {
        validator: (arr) => arr.length >= 1 && arr.length <= 3,
        message: "Mahsulotda 1 tadan 3 tagacha rasm bo'lishi kerak",
      },
      required: true,
    },

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