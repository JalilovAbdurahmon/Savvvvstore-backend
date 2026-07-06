import express from "express";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// GET /api/analytics/summary  (1-chi page: home/analytics)
router.get("/summary", protect, async (req, res) => {
  try {
    const completedOrders = await Order.find({ status: "completed" });

    const totalSoldItems = completedOrders.reduce((sum, order) => {
      return sum + order.items.reduce((s, item) => s + (item.quantity || 1), 0);
    }, 0);

    const totalRevenue = completedOrders.reduce((sum, order) => sum + order.totalPrice, 0);

    const totalOrdersCompleted = completedOrders.length;
    const totalPendingOrders = await Order.countDocuments({ status: "pending" });
    const totalProducts = await Product.countDocuments();
    const totalActiveProducts = await Product.countDocuments({ isActive: true });

    // eng ko'p sotilgan mahsulotlar — DO'KONDAGI BARCHA mahsulotlar ko'rsatiladi,
    // sotilmaganlari 0 bilan, hammasi sotilgan miqdoriga qarab kamayish tartibida
    const allProducts = await Product.find();

    const salesMap = {}; // key: mahsulot _id (string), qiymat: { quantity, revenue }
    completedOrders.forEach((order) => {
      order.items.forEach((item) => {
        const key = item.product ? String(item.product) : `name:${item.name}`;
        if (!salesMap[key]) salesMap[key] = { quantity: 0, revenue: 0 };
        salesMap[key].quantity += item.quantity || 1;
        salesMap[key].revenue += item.price * (item.quantity || 1);
      });
    });

    const topProducts = allProducts
      .map((p) => {
        const sales = salesMap[String(p._id)] || { quantity: 0, revenue: 0 };
        return { name: p.name, image: p.image, quantity: sales.quantity, revenue: sales.revenue };
      })
      .sort((a, b) => b.quantity - a.quantity);

    // oxirgi 7 kunlik sotuvlar grafigi uchun
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayOrders = completedOrders.filter(
        (o) => o.completedAt && o.completedAt >= date && o.completedAt < nextDate
      );
      const dayRevenue = dayOrders.reduce((sum, o) => sum + o.totalPrice, 0);

      last7Days.push({
        date: date.toISOString().split("T")[0],
        ordersCount: dayOrders.length,
        revenue: dayRevenue,
      });
    }

    res.json({
      totalRevenue,
      totalSoldItems,
      totalOrdersCompleted,
      totalPendingOrders,
      totalProducts,
      totalActiveProducts,
      topProducts,
      last7Days,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;