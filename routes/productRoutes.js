import express from "express";
import Product from "../models/Product.js";
import { protect } from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import { deleteImageFile } from "../utils/fileHelper.js";
import { CATEGORIES, CATEGORY_KEYS } from "../utils/categories.js";

const router = express.Router();

// GET /api/products/categories  (admin panel uchun kategoriyalar royxati)
router.get("/categories", protect, (req, res) => {
  res.json(CATEGORIES);
});

router.use(protect); // shu fayldagi barcha route'lar uchun admin token shart

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

// "existingImages" — JSON massiv (yoki vergul bilan ajratilgan) ko'rinishida
// keladi: EditModal'da foydalanuvchi o'chirmagan ESKI rasmlar ro'yxati
const parseExistingImages = (value) => {
  try {
    const parsed = Array.isArray(value) ? value : JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(value)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
};

const buildImageUrl = (filename) => `/uploads/${filename}`;

// GET /api/products  (3-chi page: barcha post qilingan mahsulotlar)
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.category && CATEGORY_KEYS.includes(req.query.category)) {
      filter.category = req.query.category;
    }
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/products  (2-chi page: yangi mahsulot qo'shish/"post qilish")
// "images" — 1 tadan 3 tagacha fayl, "name", "price", "sizes" (JSON yoki vergul bilan), "description"
router.post("/", upload.array("images", 3), async (req, res) => {
  try {
    const { name, price, sizes, category } = req.body;

    if (!name || !price || !sizes) {
      return res.status(400).json({ message: "name, price va sizes maydonlari shart" });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Kamida 1 ta mahsulot rasmi (images) yuborilishi shart" });
    }
    if (req.files.length > 3) {
      return res.status(400).json({ message: "Mahsulotga eng ko'pi bilan 3 ta rasm yuklash mumkin" });
    }
    if (!category || !CATEGORY_KEYS.includes(category)) {
      return res.status(400).json({
        message: `category maydoni shart va quyidagilardan biri bo'lishi kerak: ${CATEGORY_KEYS.join(", ")}`,
      });
    }

    const images = req.files.map((f) => buildImageUrl(f.filename));

    const product = await Product.create({
      name,
      price,
      sizes: parseSizes(sizes),
      category,
      images,
      image: images[0], // orqaga moslik uchun (MiniApp, bot, savat va h.k.)
    });

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

// PUT /api/products/:id
//
// Rasmlar bilan ishlash logikasi:
// - "existingImages" maydoni yuborilsa (JSON massiv, masalan '["/uploads/a.jpg","/uploads/b.jpg"]'):
//     shu ro'yxat "saqlanadigan eski rasmlar" deb qabul qilinadi (foydalanuvchi ba'zilarini
//     × bilan o'chirgan bo'lishi mumkin). Faqat product.images ichida haqiqatan mavjud
//     bo'lganlari qabul qilinadi (xavfsizlik uchun tashqi/notanish yo'llar rad etiladi).
// - Yangi yuklangan fayllar ("images") shu saqlangan eskilarning KETIDAN qo'shiladi.
// - Yakuniy massiv (eskilar + yangilar) 1 tadan 3 tagacha bo'lishi shart.
// - Natijaviy ro'yxatda qolmagan eski rasmlar diskdan o'chiriladi.
// - Agar "existingImages" yuborilmasa — eski (orqaga moslik) xatti-harakat: yangi rasm(lar)
//   kelsa, hammasi to'liq almashtiriladi; kelmasa, eskilari o'zgarishsiz qoladi.
router.put("/:id", upload.array("images", 3), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Mahsulot topilmadi" });

    const {
      name,
      price,
      sizes,
      isActive,
      category,
      existingImages,
    } = req.body;

    if (category !== undefined) {
      if (!CATEGORY_KEYS.includes(category)) {
        return res.status(400).json({
          message: `category quyidagilardan biri bo'lishi kerak: ${CATEGORY_KEYS.join(", ")}`,
        });
      }
      product.category = category;
    }
    if (name !== undefined) product.name = name;
    if (price !== undefined) product.price = price;
    if (isActive !== undefined) product.isActive = isActive;
    if (sizes !== undefined) product.sizes = parseSizes(sizes);

    const newFiles = req.files && req.files.length ? req.files : [];
    if (newFiles.length > 3) {
      return res.status(400).json({ message: "Mahsulotga eng ko'pi bilan 3 ta rasm yuklash mumkin" });
    }
    const newImageUrls = newFiles.map((f) => buildImageUrl(f.filename));

    let finalImages = product.images;

    if (existingImages !== undefined) {
      // Faqat product.images ichida haqiqatan mavjud bo'lgan yo'llarni qabul qilamiz
      const keptImages = parseExistingImages(existingImages).filter((img) =>
        product.images.includes(img)
      );

      finalImages = [...keptImages, ...newImageUrls];

      if (finalImages.length === 0) {
        return res.status(400).json({ message: "Mahsulotda kamida 1 ta rasm bo'lishi kerak" });
      }
      if (finalImages.length > 3) {
        return res.status(400).json({ message: "Mahsulotga eng ko'pi bilan 3 ta rasm yuklash mumkin" });
      }
    } else if (newFiles.length > 0) {
      // Orqaga moslik: existingImages yuborilmagan, lekin yangi fayl(lar) kelgan —
      // eski xatti-harakat bo'yicha hammasi to'liq almashtiriladi
      finalImages = newImageUrls;
    }
    // aks holda (existingImages yo'q va newFiles yo'q) — product.images o'zgarishsiz qoladi

    if (finalImages !== product.images) {
      // ro'yxatdan chiqib qolgan eski rasmlarni diskdan o'chiramiz
      const removed = product.images.filter((img) => !finalImages.includes(img));
      removed.forEach((imgPath) => deleteImageFile(imgPath));

      product.images = finalImages;
      product.image = finalImages[0];
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

    product.images.forEach((imgPath) => deleteImageFile(imgPath));
    await product.deleteOne();

    res.json({ message: "Mahsulot o'chirildi" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;