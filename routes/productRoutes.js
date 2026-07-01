import express from "express";
import Product from "../models/Product.js";
import { protect } from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import { deleteImageFile } from "../utils/fileHelper.js";

const router = express.Router();

router.use(protect); // shu fayldagi barcha route'lar uchun admin token shart

const buildImageUrl = (filename) => `/uploads/${filename}`;

const parseSizes = (sizes) => {
  try {
    return Array.isArray(sizes) ? sizes : JSON.parse(sizes);
  } catch {
    return String(sizes)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
};

// GET /api/products  (3-chi page: barcha post qilingan mahsulotlar)
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/products  (2-chi page: yangi mahsulot qo'shish/"post qilish")
// "image" fayl, "name", "price", "sizes" (JSON yoki vergul bilan), "description"
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { name, price, sizes, description } = req.body;

    if (!name || !price || !sizes) {
      return res.status(400).json({ message: "name, price va sizes maydonlari shart" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "Mahsulot rasmi (image) yuborilishi shart" });
    }

    const product = await Product.create({
      name,
      price,
      sizes: parseSizes(sizes),
      description: description || "",
      image: buildImageUrl(req.file.filename),
    });

    // post qilingan zahoti shu yer (3-chi page) va miniapp bitta Product kolleksiyadan o'qigani uchun avtomatik ko'rinadi
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/products/:id
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Mahsulot topilmadi" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/products/:id  (yangi rasm yuklansa eskisi o'chadi, bo'lmasa eskisi qoladi)
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Mahsulot topilmadi" });

    const { name, price, sizes, description, isActive } = req.body;

    if (name !== undefined) product.name = name;
    if (price !== undefined) product.price = price;
    if (description !== undefined) product.description = description;
    if (isActive !== undefined) product.isActive = isActive;
    if (sizes !== undefined) product.sizes = parseSizes(sizes);

    // faqat yangi rasm yuklanganda eski rasm almashtiriladi va eskisi o'chiriladi
    if (req.file) {
      deleteImageFile(product.image);
      product.image = buildImageUrl(req.file.filename);
    }

    await product.save();
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/products/:id
router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Mahsulot topilmadi" });

    deleteImageFile(product.image);
    await product.deleteOne();

    res.json({ message: "Mahsulot o'chirildi" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
