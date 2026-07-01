import express from "express";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import { notifyUser } from "../bot.js";
import { CATEGORIES, CATEGORY_KEYS } from "../utils/categories.js";

const router = express.Router();

// GET /api/public/categories  (miniapp uchun kategoriyalar royxati, uz/ru nom bilan)
router.get("/categories", async (req, res) => {
  res.json(CATEGORIES);
});

// GET /api/public/products  (miniapp uchun - faqat active mahsulotlar)
// ?category=pants kabi query bilan filtrlash mumkin
router.get("/products", async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.category && CATEGORY_KEYS.includes(req.query.category)) {
      filter.category = req.query.category;
    }
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/public/orders  (telegram bot/miniapp dan zakaz tushganda chaqiriladi -> 4-chi pagega tushadi)
router.post("/orders", async (req, res) => {
  try {
    const { telegramId, username, firstName, phone, address, items } = req.body;

    if (!telegramId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "telegramId va items (bo'sh bo'lmagan) shart" });
    }

    const totalPrice = items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);

    const order = await Order.create({
      telegramId,
      username,
      firstName,
      phone,
      address,
      items,
      totalPrice,
      status: "pending",
    });

    res.status(201).json(order);

    // foydalanuvchiga xabar (bloklamasdan, fon vazifasi sifatida)
    notifyUser(
      telegramId,
      `✅ Buyurtmangiz qabul qilindi!\nJami summa: ${totalPrice.toLocaleString()} so'm\nTez orada siz bilan bog'lanamiz.`
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
