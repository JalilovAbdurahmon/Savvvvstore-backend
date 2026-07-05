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
// Faqat bazada hali admin bo'lmasa ishlaydi (1 marta, Postman orqali birinchi admin yaratish uchun)
// Body: { username, password, setupSecret }
router.post("/setup", async (req, res) => {
  try {
    const { username, password, setupSecret } = req.body;

    if (setupSecret !== process.env.SETUP_SECRET) {
      return res.status(403).json({ message: "setupSecret noto'g'ri" });
    }

    const maxAdmins = parseInt(process.env.MAX_ADMINS) || 1;
    const adminCount = await Admin.countDocuments();
    if (adminCount >= maxAdmins) {
      return res.status(400).json({ message: `Admin limiti (${maxAdmins}) ga yetildi` });
    }

    if (!username || !password) {
      return res.status(400).json({ message: "username va password shart" });
    }

    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return res.status(400).json({ message: "Bu username bilan admin allaqachon mavjud" });
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

    if (!admin.isActive) {
      return res.status(403).json({ message: "Sizning admin panelga kirish huquqingiz bloklangan" });
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

// ---------- Adminlarni boshqarish (faqat login qilingan admin qila oladi) ----------

// GET /api/auth/admins — barcha adminlar ro'yxati
router.get("/admins", protect, async (req, res) => {
  try {
    const admins = await Admin.find().select("-password").sort({ createdAt: -1 });
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/auth/admins/:id — bitta adminni ko'rish
router.get("/admins/:id", protect, async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id).select("-password");
    if (!admin) return res.status(404).json({ message: "Admin topilmadi" });
    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/auth/admins — yangi admin qo'shish (setup'dan farqli, cheklovsiz, lekin token talab qiladi)
router.post("/admins", protect, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "username va password shart" });
    }

    const existing = await Admin.findOne({ username });
    if (existing) {
      return res.status(400).json({ message: "Bu username allaqachon band" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await Admin.create({ username, password: hashedPassword });

    res.status(201).json({ id: admin._id, username: admin.username, isActive: admin.isActive });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/auth/admins/:id/status — adminni bloklash/qayta faollashtirish
// Body: { isActive: true | false }
router.patch("/admins/:id/status", protect, async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive true yoki false bo'lishi kerak" });
    }

    if (req.params.id === String(req.admin._id) && isActive === false) {
      return res.status(400).json({ message: "O'zingizni bloklay olmaysiz" });
    }

    const admin = await Admin.findByIdAndUpdate(req.params.id, { isActive }, { new: true }).select("-password");
    if (!admin) return res.status(404).json({ message: "Admin topilmadi" });

    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/auth/admins/:id — adminni butunlay o'chirish
router.delete("/admins/:id", protect, async (req, res) => {
  try {
    if (req.params.id === String(req.admin._id)) {
      return res.status(400).json({ message: "O'zingizni o'chira olmaysiz" });
    }

    const totalAdmins = await Admin.countDocuments();
    if (totalAdmins <= 1) {
      return res.status(400).json({ message: "Oxirgi adminni o'chirib bo'lmaydi" });
    }

    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) return res.status(404).json({ message: "Admin topilmadi" });

    res.json({ message: "Admin o'chirildi", id: admin._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;