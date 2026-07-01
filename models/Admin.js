import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true }, // bcrypt bilan hash qilingan
  },
  { timestamps: true }
);

export default mongoose.model("Admin", adminSchema);
