import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

const generateToken = (admin) => {
  return jwt.sign({ id: admin._id, username: admin.username }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || "30d",
  });
};

// POST /api/auth/setup
// Faqat bazada hali admin bo'lmasa ishlaydi (1 marta, Postman orqali admin yaratish uchun)
// Body: { username, password, setupSecret }
router.post("/setup", async (req, res) => {
  try {
    const { username, password, setupSecret } = req.body;

    if (setupSecret !== process.env.SETUP_SECRET) {
      return res.status(403).json({ message: "setupSecret noto'g'ri" });
    }

    const existingAdmin = await Admin.findOne();
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin allaqachon yaratilgan. Bu endpoint faqat 1 marta ishlatiladi." });
    }

    if (!username || !password) {
      return res.status(400).json({ message: "username va password shart" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await Admin.create({ username, password: hashedPassword });

    res.status(201).json({ message: "Admin muvaffaqiyatli yaratildi", admin: { id: admin._id, username: admin.username } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Login va parol kiritilishi shart" });
    }

    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ message: "Login yoki parol noto'g'ri" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Login yoki parol noto'g'ri" });
    }

    const token = generateToken(admin);
    res.json({ token, admin: { id: admin._id, username: admin.username } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/auth/me - token tekshirish uchun (frontend session saqlash uchun)
router.get("/me", protect, async (req, res) => {
  res.json({ admin: req.admin });
});

export default router;
