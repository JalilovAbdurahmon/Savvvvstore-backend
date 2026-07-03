import express from "express";
import Order from "../models/Order.js";
import { protect } from "../middleware/auth.js";
import { notifyUser } from "../bot.js";

const router = express.Router();

router.use(protect);

// GET /api/orders  (4-chi page: yangi/kutilayotgan zakazlar)
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find({ status: "pending" }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/orders/history  (5-chi page: bajarilgan zakazlar tarixi)
router.get("/history", async (req, res) => {
  try {
    const orders = await Order.find({ status: { $in: ["completed", "cancelled"] } }).sort({
      completedAt: -1,
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/orders/:id/complete  ("Bajarildi / выполнено" bosilganda 4-page'dan 5-page'ga o'tadi)
router.put("/:id/complete", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Zakaz topilmadi" });

    order.status = "completed";
    order.completedAt = new Date();
    await order.save();

    notifyUser(order.telegramId, `📦 Buyurtmangiz yetkazib berildi! Xaridingiz uchun rahmat. 🙏`);

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/orders/:id/cancel
router.put("/:id/cancel", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Zakaz topilmadi" });

    order.status = "cancelled";
    order.completedAt = new Date();
    await order.save();

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/orders/:id  (History page'dan zakazni butunlay o'chirish)
router.delete("/:id", async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: "Zakaz topilmadi" });

    res.json({ message: "Zakaz o'chirildi", id: order._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;