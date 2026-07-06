import dotenv from "dotenv"
dotenv.config()
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import { initBot } from "./bot.js";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import userRoutes from "./routes/userRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// rasmlarni statik tarzda berish (masalan: http://localhost:5000/uploads/product-123.jpg)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- API ROUTES ---
app.use("/api/auth", authRoutes); // login, admin setup
app.use("/api/products", productRoutes); // admin: 2,3-chi page
app.use("/api/orders", orderRoutes); // admin: 4,5-chi page
app.use("/api/analytics", analyticsRoutes); // admin: 1-chi page (home)
app.use("/api/public", publicRoutes); // miniapp: mahsulotlar + zakaz berish
app.use("/api/users", userRoutes); // admin: foydalanuvchilar statistikasi

app.get("/", (req, res) => {
  res.json({ message: "Clothing shop backend ishlayapti" });
});

// 404
app.use((req, res) => {
  res.status(404).json({ message: "Route topilmadi" });
});

// global error handler (masalan multer xatolari uchun)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Server xatosi" });
});

const PORT = process.env.PORT;

// --- MongoDB ulanishi shu yerda ---
mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => {
    console.log("MongoDB ulandi ✅");
    app.listen(PORT, () => {
      console.log(`Server ishga tushdi`);
      initBot(); // telegram botni ishga tushirish
    });
  })
  .catch((error) => {
    console.error("MongoDB ulanish xatosi:", error.message);
    process.exit(1);
  });
