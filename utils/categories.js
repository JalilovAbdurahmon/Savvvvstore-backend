// Do'kondagi mahsulot kategoriyalari — bitta joyda saqlanadi
// (backend validatsiya + admin panel + miniapp shu fayldan foydalanadi)

export const CATEGORIES = [
  { key: "clothes", uz: "Kiyimlar", ru: "Одежда" },
  { key: "pants", uz: "Shimlar", ru: "Брюки" },
  { key: "tshirts", uz: "Futbolkalar", ru: "Футболки" },
  { key: "shoes", uz: "Oyoq kiyimlar", ru: "Обувь" },
  { key: "shorts", uz: "Shortiklar", ru: "Шорты" },
  { key: "others", uz: "Boshqalar", ru: "Другое" },
];

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);
