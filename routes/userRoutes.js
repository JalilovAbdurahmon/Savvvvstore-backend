import express from "express";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// GET /api/users/stats — admin panel uchun umumiy statistika
router.get("/stats", protect, async (req, res) => {
  try {
    const totalStarted = await User.countDocuments(); // /start bosgan hammasi
    const totalRegistered = await User.countDocuments({ step: "done" }); // ism+telefon to'liq bergan
    res.json({ totalStarted, totalRegistered });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/users — barcha foydalanuvchilar ro'yxati (eng yangisi birinchi)
router.get("/", protect, async (req, res) => {
  try {
    const users = await User.find().sort({ startedAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
