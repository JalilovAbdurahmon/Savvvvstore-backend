import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// imagePath misol: "/uploads/product-12345.jpg"
export const deleteImageFile = (imagePath) => {
  if (!imagePath) return;
  const filePath = path.join(__dirname, "..", imagePath);
  fs.unlink(filePath, (err) => {
    if (err && err.code !== "ENOENT") {
      console.error("Rasmni o'chirishda xatolik:", err.message);
    }
  });
};