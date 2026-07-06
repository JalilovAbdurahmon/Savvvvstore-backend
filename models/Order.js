import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    name: { type: String, required: true },
    size: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 1 },
    image: { type: String },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    telegramId: { type: String, required: true },
    username: { type: String },
    firstName: { type: String },
    phone: { type: String },
    // Manzil matni (Mini App reverse-geocode qilgan bo'lsa) — faqat ko'rsatish uchun,
    // ixtiyoriy. Google Maps linki endi shu maydonga emas, lat/lng'ga tayanadi.
    address: { type: String },
    // Xaritadagi aniq koordinata — Google Maps linkini shundan quramiz,
    // shunda link har doim ishonchli va bir xil formatda bo'ladi
    latitude: { type: Number },
    longitude: { type: Number },
    items: { type: [orderItemSchema], required: true },
    totalPrice: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
    },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
