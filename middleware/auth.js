import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

export const protect = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Avtorizatsiyadan o'tilmagan, token topilmadi" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Bazadan qayta tekshiramiz — shunda admin o'chirilgan/bloklangan bo'lsa,
    // eski token muddati tugashini kutmasdan darhol kirish rad etiladi
    const admin = await Admin.findById(decoded.id).select("-password");
    if (!admin) {
      return res.status(401).json({ message: "Admin topilmadi" });
    }
    if (!admin.isActive) {
      return res.status(403).json({ message: "Sizning admin panelga kirish huquqingiz bloklangan" });
    }

    req.admin = admin; // { id, username, isActive, ... }
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token yaroqsiz yoki muddati o'tgan" });
  }
};