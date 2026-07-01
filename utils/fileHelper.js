import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// imagePath misol: /uploads/product-12345.jpg
export const deleteImageFile = (imagePath) => {
  if (!imagePath) return;
  try {
    const fileName = path.basename(imagePath);
    const fullPath = path.join(__dirname, "..", "uploads", fileName);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    console.error("Rasmni o'chirishda xatolik:", err.message);
  }
};
