import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
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
    req.admin = decoded; // { id, username }
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token yaroqsiz yoki muddati o'tgan" });
  }
};
