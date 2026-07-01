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
    address: { type: String },
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
