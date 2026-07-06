import express from "express";
import Order from "../models/Order.js";
import { protect } from "../middleware/auth.js";
import { notifyOrderCompleted, notifyOrderCancelled } from "../bot.js";

const router = express.Router();

router.use(protect);

router.get("/", async (req, res) => {
  try {
    const orders = await Order.find({ status: "pending" }).sort({
      createdAt: -1,
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/history", async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $in: ["completed", "cancelled"] },
    }).sort({
      completedAt: -1,
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/:id/complete", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Zakaz topilmadi" });

    order.status = "completed";
    order.completedAt = new Date();
    await order.save();

    notifyOrderCompleted(order.telegramId);

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/:id/cancel", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Zakaz topilmadi" });

    order.status = "cancelled";
    order.completedAt = new Date();
    await order.save();

    notifyOrderCancelled(order.telegramId);

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

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
