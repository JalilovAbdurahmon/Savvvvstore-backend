import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    telegramId: { type: String, required: true, unique: true, index: true },
    username: { type: String }, // telegram @username (bo'lmasligi ham mumkin)
    name: { type: String }, // bot ichida kiritilgan ism
    phone: { type: String },
    lang: { type: String, enum: ["uz", "ru"], default: "uz" },
    // "lang" -> til tanlamoqda, "name" -> ism kiritmoqda,
    // "phone" -> raqam kutilmoqda, "done" -> ro'yxatdan to'liq o'tgan
    step: {
      type: String,
      enum: ["lang", "name", "phone", "done"],
      default: "lang",
    },
    // Foydalanuvchi ilk marta /start bosgan payt — shu orqali
    // "nechta odam start bosgan" statistikasi hisoblanadi
    startedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
