import TelegramBot from "node-telegram-bot-api";
import Order from "./models/Order.js";
import User from "./models/User.js";

let bot = null;

// Vaqtinchalik holat (faqat onboarding jarayoni uchun, RAM da) — bu doimiy
// ma'lumot emas, shuning uchun bazaga yozilmaydi
// step: "lang" | "name" | "phone" | "choose_lang_only"
const userState = new Map();

// ---------- Foydalanuvchilar bazasi endi MongoDB'da ----------
const getUser = async (chatId) => {
  return User.findOne({ telegramId: String(chatId) });
};

const saveUser = async (chatId, data) => {
  return User.findOneAndUpdate(
    { telegramId: String(chatId) },
    { $set: data },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

// ---------- Miniapp (do'kon) tugmasi ----------
const isMiniAppUrlValid = (url) =>
  Boolean(url) &&
  url.startsWith("https://") &&
  url !== "https://yourdomain.com";

// Foydalanuvchi botda tanlagan tilni Mini App'ga ?lang= orqali uzatamiz,
// shunda Mini App ham bot bilan bir xil tilda ochiladi
const buildMiniAppUrl = (baseUrl, lang) =>
  `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}lang=${lang}`;

// Muhim: Mini App faqat "Keyboard button" (persistent reply keyboard) orqali ochilganda
// tg.sendData() ishlaydi (Telegram cheklovi). Shuning uchun /menu, order_click va h.k.
// barchasi mainKeyboard()ni qayta yuboradi — alohida inline tugma emas.
const sendShopButton = async (chatId, lang) => {
  const miniAppUrl = process.env.MINIAPP_URL;

  if (!isMiniAppUrlValid(miniAppUrl)) {
    // MINIAPP_URL hali sozlanmagan (https bolishi va yourdomain.com bolmasligi kerak)
    await bot.sendMessage(chatId, t(lang, "orderSoon"));
    return;
  }

  await bot.sendMessage(chatId, t(lang, "mainMenu"), mainKeyboard(lang));
};

// ---------- Statik kontakt ma'lumotlari (hamma uchun bir xil) ----------
const SUPPORT_INFO = {
  phone: "+998900237522", // <-- bu yerga haqiqiy raqamni qo'ying
  username: "@savvvvadmin", // <-- agar Telegram username bo'lsa
  workHours: {
    uz: "Har kuni 09:00 - 21:00",
    ru: "Ежедневно 09:00 - 21:00",
  },
};

const TEXTS = {
  uz: {
    chooseLang: "Tilni tanlang / Выберите язык:",
    askName: "Ismingizni kiriting:",
    askPhone: "Rahmat, {name}! Endi telefon raqamingizni yuboring 👇",
    shareContact: "📱 Raqamni yuborish",
    accessGranted:
      "✅ Tabriklaymiz, {name}! Sizga botdan foydalanish uchun ruxsat berildi.\n\nBuyurtma berish uchun pastdagi Menu dan foydalaning.",
    welcomeBack: "Xush kelibsiz, {name}! 👋",
    alreadyRegistered: "✅ Siz allaqachon ro'yxatdan o'tgansiz!",
    mainMenu: "📋 Asosiy menyu:",
    orderSoon: "Bu funksiya tez orada ishga tushadi 🚧",
    invalidContact: "Iltimos, pastdagi tugma orqali kontaktingizni yuboring.",
    notRegistered: "Avval ro'yxatdan o'ting: /start ni bosing.",
    contactUpdated: "Raqamingiz yangilandi ✅",
    menuShop: "Menyu",
    menuLang: "Tilni o'zgartirish",
    menuContact: "Kontakt",
    contactInfo:
      "☎️ Biz bilan bog'lanish:\n\n📞 Telefon: {phone}\n💬 Telegram: {username}\n🕐 Ish vaqti: {hours}",
    // Endi manzil {address} shu yerdan olib tashlandi — alohida HTML link sifatida qo'shiladi
    orderPlaced:
      "✅ Buyurtmangiz qabul qilindi!\n\n💰 Jami summa: {total} so'm\nTez orada siz bilan bog'lanamiz.",
    viewOnMap: "📍 Xaritada ko'rish",
    orderError:
      "❌ Buyurtmani saqlashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
    cartEmpty: "Savat bo'sh, avval Menyudan mahsulot tanlang.",
    locationMissing:
      "❌ Manzil aniqlanmadi. Iltimos, Menyuga qayting va buyurtmani xaritada manzilni tasdiqlab qayta yuboring.",
  },
  ru: {
    chooseLang: "Tilni tanlang / Выберите язык:",
    askName: "Введите ваше имя:",
    askPhone: "Спасибо, {name}! Теперь отправьте ваш номер телефона 👇",
    shareContact: "📱 Отправить номер",
    accessGranted:
      "✅ Поздравляем, {name}! Вам предоставлен доступ к боту.\n\nДля заказа используйте кнопку Меню внизу.",
    welcomeBack: "С возвращением, {name}! 👋",
    alreadyRegistered: "✅ Вы уже зарегистрированы!",
    mainMenu: "📋 Главное меню:",
    orderSoon: "Эта функция скоро будет доступна 🚧",
    invalidContact: "Пожалуйста, отправьте контакт через кнопку ниже.",
    notRegistered: "Сначала зарегистрируйтесь: нажмите /start.",
    contactUpdated: "Ваш номер обновлён ✅",
    menuShop: "Меню",
    menuLang: "Сменить язык",
    menuContact: "Контакт",
    contactInfo:
      "☎️ Связаться с нами:\n\n📞 Телефон: {phone}\n💬 Telegram: {username}\n🕐 Время работы:\n{hours}",
    // Endi manzil {address} shu yerdan olib tashlandi — alohida HTML link sifatida qo'shiladi
    orderPlaced:
      "✅ Ваш заказ принят!\n\n💰 Общая сумма: {total} сум\nМы скоро свяжемся с вами.",
    viewOnMap: "📍 Посмотреть на карте",
    orderError: "❌ Ошибка при сохранении заказа. Попробуйте ещё раз.",
    cartEmpty: "Корзина пуста, сначала выберите товар в Меню.",
    locationMissing:
      "❌ Адрес не определён. Вернитесь в Меню и подтвердите адрес на карте, затем отправьте заказ снова.",
  },
};

const t = (lang, key, vars = {}) => {
  let str = TEXTS[lang][key];
  Object.entries(vars).forEach(([k, v]) => {
    str = str.replace(`{${k}}`, v);
  });
  return str;
};

// ---------- Asosiy reply keyboard (pastki "⊞" tugma orqali ochiladi/yopiladi) ----------
// "Menyu" tugmasi endi web_app orqali to'g'ridan-to'g'ri Mini App'ni ochadi (xabar yubormaydi)
const mainKeyboard = (lang) => {
  const miniAppUrl = process.env.MINIAPP_URL;

  const shopButton = isMiniAppUrlValid(miniAppUrl)
    ? {
        text: `🛍 ${t(lang, "menuShop")}`,
        web_app: { url: buildMiniAppUrl(miniAppUrl, lang) },
      }
    : { text: `🛍 ${t(lang, "menuShop")}` }; // MINIAPP_URL hali sozlanmagan bo'lsa, oddiy tugma qoladi

  return {
    reply_markup: {
      keyboard: [
        [shopButton],
        [
          { text: `🌐 ${t(lang, "menuLang")}` },
          { text: `📞 ${t(lang, "menuContact")}` },
        ],
      ],
      resize_keyboard: true,
      // is_persistent: true,
    },
  };
};

// ---------- Har bir foydalanuvchi uchun tilga mos komandalar menyusini o'rnatish ----------
const setUserCommands = async (chatId, lang) => {
  try {
    await bot.setMyCommands(
      [
        { command: "menu", description: `🛍 ${t(lang, "menuShop")}` },
        { command: "language", description: `🌐 ${t(lang, "menuLang")}` },
        { command: "contact", description: `📞 ${t(lang, "menuContact")}` },
      ],
      { scope: { type: "chat", chat_id: chatId } }
    );
  } catch (error) {
    console.error("setMyCommands xatosi:", error.message);
  }
};

// ---------- Statik kontakt ma'lumotini yuborish ----------
const sendContactInfo = async (chatId, lang) => {
  const text = t(lang, "contactInfo", {
    phone: SUPPORT_INFO.phone,
    username: SUPPORT_INFO.username,
    hours: SUPPORT_INFO.workHours[lang],
  });
  await bot.sendMessage(chatId, text);
};

export const initBot = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const miniAppUrl = process.env.MINIAPP_URL; // HTTPS bo'lishi shart

  if (!token || token === "your_bot_token_here") {
    console.log("TELEGRAM_BOT_TOKEN .env da kiritilmagan, bot ishga tushmadi.");
    return null;
  }

  bot = new TelegramBot(token, { polling: true });

  // ---------- /start ----------
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      const existingUser = await getUser(chatId);

      if (existingUser && existingUser.step === "done") {
        userState.delete(chatId);
        await setUserCommands(chatId, existingUser.lang);
        await bot.sendMessage(
          chatId,
          t(existingUser.lang, "alreadyRegistered")
        );
        await bot.sendMessage(
          chatId,
          t(existingUser.lang, "mainMenu"),
          mainKeyboard(existingUser.lang)
        );
        return;
      }

      // Yangi foydalanuvchi (yoki oldin to'liq ro'yxatdan o'tmagan) — tildan boshlaymiz.
      // Shu yerda darhol bazaga yozamiz: shunda "start" bosganlar soni to'g'ri hisoblanadi,
      // hatto foydalanuvchi ism/telefon bosqichini tugatmasa ham.
      await saveUser(chatId, {
        username: msg.from?.username || "",
        step: "lang",
      });

      userState.set(chatId, { step: "lang" });
      await bot.sendMessage(chatId, TEXTS.uz.chooseLang, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🇺🇿 O'zbekcha", callback_data: "lang_uz" },
              { text: "🇷🇺 Русский", callback_data: "lang_ru" },
            ],
          ],
        },
      });
    } catch (error) {
      console.error("Bot /start xatosi:", error.message);
    }
  });

  // ---------- /menu — miniapp ochish ----------
  bot.onText(/\/menu/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await getUser(chatId);

    if (!user || user.step !== "done") {
      await bot.sendMessage(chatId, t("uz", "notRegistered"));
      return;
    }

    await sendShopButton(chatId, user.lang);
  });

  // ---------- /language — tilni qayta tanlash ----------
  bot.onText(/\/language/, async (msg) => {
    const chatId = msg.chat.id;
    userState.set(chatId, { step: "choose_lang_only" });

    await bot.sendMessage(chatId, TEXTS.uz.chooseLang, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🇺🇿 O'zbekcha", callback_data: "lang_uz" },
            { text: "🇷🇺 Русский", callback_data: "lang_ru" },
          ],
        ],
      },
    });
  });

  // ---------- /contact — statik bog'lanish ma'lumotini chiqarish ----------
  bot.onText(/\/contact/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await getUser(chatId);
    const lang = user?.lang || "uz";

    await sendContactInfo(chatId, lang);
  });

  // ---------- Til tanlanganda ----------
  bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data === "lang_uz" || data === "lang_ru") {
      const lang = data === "lang_uz" ? "uz" : "ru";
      const state = userState.get(chatId);

      try {
        await bot.answerCallbackQuery(query.id);
        await bot.editMessageReplyMarkup(
          { inline_keyboard: [] },
          { chat_id: chatId, message_id: query.message.message_id }
        );

        // /language orqali kelgan bo'lsa — faqat tilni yangilab qo'yamiz
        if (state?.step === "choose_lang_only") {
          const user = await getUser(chatId);
          if (user) await saveUser(chatId, { lang });
          userState.delete(chatId);
          await setUserCommands(chatId, lang);
          await bot.sendMessage(
            chatId,
            t(lang, "welcomeBack", { name: user?.name || "" }),
            mainKeyboard(lang)
          );
          return;
        }

        // Birinchi marta ro'yxatdan o'tish jarayoni
        await saveUser(chatId, { lang, step: "name" });
        userState.set(chatId, { step: "name", lang });
        await bot.sendMessage(chatId, t(lang, "askName"));
      } catch (error) {
        console.error("Til tanlash xatosi:", error.message);
      }
      return;
    }

    if (data === "order_click") {
      const user = await getUser(chatId);
      const lang = user?.lang || "uz";
      await bot.answerCallbackQuery(query.id);
      await sendShopButton(chatId, lang);
    }
  });

  // ---------- Matnli xabarlar ----------
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const user = await getUser(chatId);

    // ---------- Mini App'dan savat + manzil (zakaz) ma'lumoti kelganda ----------
    // Endi Mini App ichida foydalanuvchi manzilni xaritada tasdiqlab bo'lgach,
    // items va location BIRGALIKDA bitta paketda keladi — bot alohida
    // location so'rab, kutib o'tirishi shart emas, zakaz darhol yaratiladi.
    if (msg.web_app_data) {
      if (!user || user.step !== "done") {
        await bot.sendMessage(chatId, t("uz", "notRegistered"));
        return;
      }

      let payload;
      try {
        payload = JSON.parse(msg.web_app_data.data);
      } catch (error) {
        console.error("web_app_data parse xatosi:", error.message);
        return;
      }

      if (
        !payload?.items ||
        !Array.isArray(payload.items) ||
        payload.items.length === 0
      ) {
        await bot.sendMessage(chatId, t(user.lang, "cartEmpty"));
        return;
      }

      const {
        latitude,
        longitude,
        address: addressText,
      } = payload.location || {};
      if (typeof latitude !== "number" || typeof longitude !== "number") {
        // Mini App manzilni tasdiqlamasdan yubormasligi kerak, lekin himoya uchun tekshiramiz
        await bot.sendMessage(chatId, t(user.lang, "locationMissing"));
        return;
      }

      // Google'ning rasmiy universal-link formati — mobil va web'da bir xil ishonchli ochiladi
      const mapLink = `https://maps.google.com/?q=${latitude},${longitude}`;

      const totalPrice = payload.items.reduce(
        (sum, item) => sum + item.price * (item.quantity || 1),
        0
      );

      try {
        await Order.create({
          telegramId: String(chatId),
          username: msg.from?.username || "",
          firstName: user.name || "", // ism — ro'yxatdan o'tishda saqlangan
          phone: user.phone || "", // telefon — ro'yxatdan o'tishda saqlangan
          address: addressText || "", // faqat matn manzil (agar Mini App yuborgan bo'lsa)
          latitude,
          longitude,
          items: payload.items,
          totalPrice,
          status: "pending",
        });

        const addressLabel = addressText || t(user.lang, "viewOnMap");
        const orderMsg = t(user.lang, "orderPlaced", {
          total: totalPrice.toLocaleString(),
        });

        // HTML parse_mode bilan — manzil har doim toza, bosiladigan link bo'lib chiqadi
        await bot.sendMessage(
          chatId,
          `${orderMsg}\n\n<a href="${mapLink}">${addressLabel}</a>`,
          { parse_mode: "HTML", ...mainKeyboard(user.lang) }
        );
      } catch (error) {
        console.error("Zakaz yaratishda xatolik:", error.message);
        await bot.sendMessage(
          chatId,
          t(user.lang, "orderError"),
          mainKeyboard(user.lang)
        );
      }
      return;
    }

    // ---------- Reply keyboard tugmalari (faqat ro'yxatdan o'tgan foydalanuvchi uchun) ----------
    if (user && user.step === "done" && text) {
      if (text.includes(t(user.lang, "menuShop"))) {
        await sendShopButton(chatId, user.lang);
        return;
      }

      if (text.includes(t(user.lang, "menuLang"))) {
        userState.set(chatId, { step: "choose_lang_only" });
        await bot.sendMessage(chatId, TEXTS.uz.chooseLang, {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "🇺🇿 O'zbekcha", callback_data: "lang_uz" },
                { text: "🇷🇺 Русский", callback_data: "lang_ru" },
              ],
            ],
          },
        });
        return;
      }

      if (text.includes(t(user.lang, "menuContact"))) {
        // Raqam so'ralmaydi — statik bog'lanish ma'lumoti chiqadi
        await sendContactInfo(chatId, user.lang);
        return;
      }
    }

    // ---------- Onboarding jarayoni (ism/raqam) ----------
    const state = userState.get(chatId);
    if (!state || msg.contact) return;
    if (text && text.startsWith("/")) return;

    if (state.step === "name" && text) {
      const name = text.trim();
      userState.set(chatId, { ...state, step: "phone", name });

      try {
        await saveUser(chatId, { name, step: "phone" });
        await bot.sendMessage(chatId, t(state.lang, "askPhone", { name }), {
          reply_markup: {
            keyboard: [
              [{ text: t(state.lang, "shareContact"), request_contact: true }],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        });
      } catch (error) {
        console.error("Ism qabul qilishda xatolik:", error.message);
      }
      return;
    }

    if (state.step === "phone" && text) {
      try {
        await bot.sendMessage(chatId, t(state.lang, "invalidContact"));
      } catch (error) {
        console.error(error.message);
      }
    }
  });

  // ---------- Kontakt (raqam) yuborilganda — faqat ro'yxatdan o'tishda ishlatiladi ----------
  bot.on("contact", async (msg) => {
    const chatId = msg.chat.id;
    const state = userState.get(chatId);
    if (!state || state.step !== "phone") return;

    const phone = msg.contact.phone_number;
    const name = state.name;
    const lang = state.lang;

    try {
      await saveUser(chatId, { lang, name, phone, step: "done" });
      userState.delete(chatId);

      await bot.sendMessage(
        chatId,
        t(lang, "accessGranted", { name }),
        mainKeyboard(lang)
      );
      await setUserCommands(chatId, lang);
    } catch (error) {
      console.error("Kontaktni qabul qilishda xatolik:", error.message);
    }
  });

  console.log("Telegram bot ishga tushdi (polling rejimida).");
  return bot;
};

// Zakaz qabul qilinganda yoki holati o'zgarganda foydalanuvchiga xabar yuborish uchun
export const notifyUser = async (telegramId, text) => {
  if (!bot) return;
  try {
    await bot.sendMessage(telegramId, text);
  } catch (error) {
    console.error("Foydalanuvchiga xabar yuborishda xatolik:", error.message);
  }
};

export const getBot = () => bot;
export const getSavedUser = async (chatId) => getUser(chatId);
