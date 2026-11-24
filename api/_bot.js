// DigiBaku avtomatik çat botu: məhsullar, qiymətlər, FAQ və ümumi suallar üçün hazır cavablar.
// Verilənlər bazasından (admin paneldə yazılanlardan) oxuyur. Yeni məlumat yazmır, uydurmur.

const MONTHS = [1, 2, 3, 6, 12];
const STOP = ["haqqinda", "melumat", "lazimdir", "isteyirem", "istiyirem", "necedir", "nedir", "olarmi", "zehmet", "olmasa",
  "bilmek", "barede", "about", "please", "want", "need", "this", "that", "with", "what", "have", "tell", "меня", "хочу", "нужно", "пожалуйста"];

function norm(s) {
  return String(s || "").toLowerCase()
    .replace(/ə/g, "e").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u")
    .replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ё/g, "е")
    .replace(/[^a-z0-9а-я\s]/g, " ").replace(/\s+/g, " ").trim();
}
function tokens(s) {
  return norm(s).split(" ").filter(function (w) { return w.length >= 3 && STOP.indexOf(w) < 0; });
}
function has(n, list) {
  const p = " " + n + " ";
  return list.some(function (k) { return k.length <= 3 ? p.indexOf(" " + k + " ") >= 0 : p.indexOf(k) >= 0; });
}

const KW = {
  greet: ["salam", "salaam", "sabahiniz", "axsaminiz", "gunaydin", "hello", "hey", "hi", "privet", "привет", "здравств", "добрый", "доброе"],
  thanks: ["sagol", "sag ol", "tesekkur", "minnetdar", "thanks", "thank", "спасибо", "благодар"],
  human: ["operator", "admin", "insan", "canli", "yetkili", "human", "agent", "оператор", "человек", "менеджер", "админ"],
  wellbeing: ["necesen", "necesiniz", "yaxsisan", "yaxsiyam", "nece sen", "nece siniz", "hal hazirda", "hal-hazirda", "kefin", "как дела", "как ты", "как вы", "how are you"],
  identity: ["adin nedir", "adiniz nedir", "adin ne", "sen kimsen", "robotsan", "robotsen", "botsan", "ai misen", "как тебя", "кто ты", "ты робот", "ты бот"],
  about: ["saytiniz", "bu sayt", "sayt haqqinda", "haqqinizda", "haqqimizda", "siz kimsiniz", "digibaku nedir", "sirket", "о сайте", "о компании", "о вас", "кто вы", "о digibaku"],
  help: ["komek", "yardim", "help", "ne ede bilirsen", "nece komek", "что умеешь", "помощь", "помоги"],
  price: ["qiymet", "neqeder", "ne qeder", "nece manat", "manat", "azn", "price", "cost", "how much", "сколько", "цена", "цены", "стоим", "стоит"],
  order: ["sifaris", "almaq", "alim", "order", "buy", "purchase", "заказ", "купить", "оформ"],
  pay: ["odenis", "odeme", "kart", "payment", "pay ", "оплат", "bank", "kartla", "nagd"],
  contact: ["elaqe", "nomre", "whatsapp", "vatsap", "telefon", "is saat", "iw saat", "saat", "hours", "contact", "phone", "связ", "контакт", "телефон", "время работы", "график"],
  list: ["mehsul", "teklif", "tovsiye", "mesvere", "hansi", "ne var", "siyahi", "kataloq", "xidmet", "kampaniya", "endirim", "products", "recommend", "suggest", "catalog", "discount", "sale", "товар", "посоветуй", "рекоменд", "что есть", "каталог", "услуг", "скидк", "акци"],
  delivery: ["catdir", "nece vaxt", "ne vaxt", "nə vaxt", "hazir olur", "delivery", "how long", "доставк", "когда", "как быстро"]
};

const TX = {
  az: {
    greet: "Salam! DigiBaku-ya xoş gəlmisiniz 👋\nMən avtomatik köməkçiyəm. Məhsullar, qiymətlər, sifariş və sayt haqqında suallarınızı cavablandıra bilərəm.",
    hi: "Salam! 👋",
    thanks: "Rica edirik! Başqa sualınız olsa, yazın 😊",
    wellbeing: "Təşəkkür edirəm, əla! Siz necəsiniz? DigiBaku-da sizə necə kömək edə bilərəm?",
    identity: "Mən DigiBaku-nun çat köməkçisiyəm — avtomatik köməkçi. Operator sizə şəxsən də cavab verəcək. Hazırda məhsullar, qiymətlər, sifariş və sayt haqqında sizə kömək edə bilərəm. Nə ilə başlayaq?",
    about: "DigiBaku — rəqəmsal xidmət və abunəlik məhsullarının satıldığı onlayn mağazadır. Məhsulu seçib müddəti təyin edirsiniz, sifarişi saytda verirsiniz, sonra WhatsApp-da təsdiqlənir.",
    help: "Bu çatda sizə kömək edə bilərəm:\n• Məhsullar və xüsusiyyətləri\n• Qiymətlər və müddətlər\n• Sifarişin necə verildiyi\n• Əlaqə və iş saatları\nSualınızı yazın və ya aşağıdakı düymələrdən birini seçin.",
    offline: "Operator onlayn olduqda sizə şəxsən cavab verəcək.",
    human: "Mesajınız operatora çatdırıldı, ən qısa zamanda cavab veriləcək. Təcili olarsa WhatsApp-dan yaza bilərsiniz.",
    prices: "Qiymətlər (başlanğıc):", from: "başlanğıc", month: "ay", old: "əvvəl",
    details: "Ətraflı və sifariş", priceHead: "Qiymətlər:", features: "Xüsusiyyətlər:",
    several: "Bu axtarışa uyğun məhsullar:", suggest: "Sizə bunları təklif edirəm:",
    catalog: "Bütün məhsullar", more: "Digər məhsullar üçün", waBtn: "WhatsApp-da yaz",
    order: "Sifariş etmək üçün:\n1) Məhsulu seçin və müddəti təyin edin\n2) Ad və WhatsApp nömrənizi yazın\n3) «WhatsApp-la sifariş et» düyməsinə basın\nSifarişiniz təsdiqləndikdən sonra hazırlanır.",
    pay: "Ödəniş üsulları barədə dəqiq məlumatı sifariş zamanı operator WhatsApp-da təqdim edir.",
    delivery: "Sifarişiniz təsdiqləndikdən sonra hazırlanır. Dəqiq müddəti operator sifariş zamanı bildirəcək.",
    contactHead: "Əlaqə:", hours: "İş saatları", wa: "WhatsApp",
    fallback: "Sualınızı tam başa düşə bilmədim, amma buradayam 🙂 Məhsullar, qiymətlər, sifariş və ya sayt haqqında soruşa bilərsiniz. Və ya sadəcə söhbət edə bilərik.",
    faqFrom: "Cavab:"
  },
  ru: {
    greet: "Здравствуйте! Добро пожаловать в DigiBaku 👋\nЯ автоматический помощник: отвечу про товары, цены и оформление заказа.",
    hi: "Здравствуйте! 👋",
    thanks: "Пожалуйста! Если появятся вопросы, пишите 😊",
    wellbeing: "Спасибо, всё отлично! А у вас как дела? Чем могу помочь в DigiBaku?",
    identity: "Я автоматический помощник чата DigiBaku. Оператор тоже ответит вам лично. Могу помочь с товарами, ценами, заказом и вопросами о сайте. С чего начнём?",
    about: "DigiBaku — интернет-магазин цифровых сервисов и подписок. Вы выбираете товар и срок, оформляете заказ на сайте, а затем он подтверждается в WhatsApp.",
    help: "Я могу помочь с:\n• товарами и их особенностями\n• ценами и сроками\n• оформлением заказа\n• контактами и временем работы\nНапишите вопрос или выберите кнопку ниже.",
    offline: "Когда оператор будет онлайн, он ответит вам лично.",
    human: "Ваше сообщение передано оператору, он ответит как можно скорее. Если срочно, напишите в WhatsApp.",
    prices: "Цены (от):", from: "от", month: "мес.", old: "было",
    details: "Подробнее и заказ", priceHead: "Цены:", features: "Особенности:",
    several: "Подходящие товары:", suggest: "Рекомендую:",
    catalog: "Все товары", more: "Другие товары", waBtn: "Написать в WhatsApp",
    order: "Как заказать:\n1) Выберите товар и срок\n2) Укажите имя и номер WhatsApp\n3) Нажмите «Заказать в WhatsApp»\nЗаказ готовится после подтверждения.",
    pay: "Подробности об оплате оператор сообщит в WhatsApp при оформлении заказа.",
    delivery: "Заказ готовится после подтверждения. Точный срок сообщит оператор при оформлении.",
    contactHead: "Контакты:", hours: "Время работы", wa: "WhatsApp",
    fallback: "Не совсем поняла вопрос, но я на связи 🙂 Спросите о товарах, ценах, заказе или о сайте. Или просто поговорим.",
    faqFrom: "Ответ:"
  },
  en: {
    greet: "Hello! Welcome to DigiBaku 👋\nI'm an automatic assistant. I can answer questions about products, prices and ordering.",
    hi: "Hello! 👋",
    thanks: "You're welcome! Write again if you have more questions 😊",
    wellbeing: "Thanks, I'm doing great! How about you? How can I help you with DigiBaku?",
    identity: "I'm DigiBaku's automatic chat assistant. An operator will also reply to you personally. I can help with products, prices, ordering and questions about the site. Where shall we start?",
    about: "DigiBaku is an online shop for digital services and subscriptions. You pick a product and duration, place the order on the site, and it is confirmed via WhatsApp.",
    help: "I can help you with:\n• products and their features\n• prices and durations\n• how to place an order\n• contacts and working hours\nWrite your question or pick a button below.",
    offline: "When an operator is online, they will reply to you personally.",
    human: "Your message was passed to the operator, who will reply as soon as possible. For urgent matters, message us on WhatsApp.",
    prices: "Prices (from):", from: "from", month: "mo", old: "was",
    details: "Details and order", priceHead: "Prices:", features: "Features:",
    several: "Matching products:", suggest: "I suggest:",
    catalog: "All products", more: "More products", waBtn: "Chat on WhatsApp",
    order: "How to order:\n1) Choose a product and duration\n2) Enter your name and WhatsApp number\n3) Press “Order via WhatsApp”\nYour order is prepared after confirmation.",
    pay: "The operator will share payment details on WhatsApp when you place the order.",
    delivery: "Your order is prepared after confirmation. The operator will tell you the exact time when you order.",
    contactHead: "Contact:", hours: "Working hours", wa: "WhatsApp",
    fallback: "I didn't quite get that, but I'm here 🙂 Ask about products, prices, ordering or the site. Or we can just chat.",
    faqFrom: "Answer:"
  }
};

function pname(p, lang) { return p.name[lang] || p.name.az || p.name.en || ""; }
function money(n) { return Number(n).toFixed(2) + " AZN"; }
function link(p) { return "product.html?slug=" + encodeURIComponent(p.slug); }
// Çat pəncərəsi xam link göstərmir: [yazı](keçid) düymə, {{p|slug|ad|qiymət}} məhsul kartı kimi çəkilir
function clean(s) { return String(s == null ? "" : s).replace(/[|{}\[\]\n\r]/g, " ").replace(/\s+/g, " ").trim(); }
function mdLink(label, url) { return "[" + clean(label) + "](" + url + ")"; }
function card(p, lang, t) {
  const m = minPrice(p);
  return "{{p|" + encodeURIComponent(p.slug) + "|" + clean(pname(p, lang)) + "|" + t.from + " " + money(m.price) + "}}";
}
function minPrice(p) { return p.prices.reduce(function (a, b) { return b.price < a.price ? b : a; }, p.prices[0]); }

function productDetail(p, lang, t) {
  const lines = ["**" + clean(pname(p, lang)) + "**"];
  const d = String(p.description[lang] || p.description.az || "").trim();
  if (d) lines.push(d.length > 260 ? d.slice(0, 257) + "..." : d);
  const feats = (p.features[lang] && p.features[lang].length ? p.features[lang] : p.features.az) || [];
  if (feats.length) lines.push(t.features + "\n" + feats.slice(0, 4).map(function (f) { return "• " + f; }).join("\n"));
  lines.push(t.priceHead + "\n" + p.prices.map(function (x) {
    return "• " + x.months + " " + t.month + " — " + money(x.price) + (x.old ? " (" + t.old + " " + money(x.old) + ")" : "");
  }).join("\n"));
  lines.push(mdLink(t.details, link(p)));
  return lines.join("\n\n");
}

function productList(list, lang, t, head) {
  return head + "\n" + list.map(function (p) { return card(p, lang, t); }).join("\n");
}

async function loadData(pool) {
  const prods = await pool.query(
    `select p.product_key, p.name_az, p.name_ru, p.name_en, p.slug, p.category_key,
            p.description_az, p.description_ru, p.description_en,
            p.features_az, p.features_ru, p.features_en, p.sort_order,
            pp.price_1_month, pp.price_2_month, pp.price_3_month, pp.price_6_month, pp.price_12_month,
            pp.sale_1_price, pp.sale_2_price, pp.sale_3_price, pp.sale_6_price, pp.sale_12_price,
            pp.sale_1_active, pp.sale_2_active, pp.sale_3_active, pp.sale_6_active, pp.sale_12_active
     from site_products p left join product_prices pp on pp.product_key = p.product_key
     where p.active = true order by p.sort_order, p.name_az`);
  const products = prods.rows.map(function (r) {
    const prices = [];
    MONTHS.forEach(function (m) {
      const base = Number(r["price_" + m + "_month"]);
      const sale = Number(r["sale_" + m + "_price"]);
      const on = r["sale_" + m + "_active"] === true && sale > 0;
      if (on && base > 0 && sale < base) prices.push({ months: m, price: sale, old: base });
      else if (base > 0) prices.push({ months: m, price: base, old: null });
    });
    return {
      product_key: r.product_key, slug: r.slug || r.product_key, category_key: r.category_key,
      name: { az: r.name_az || r.name_en, ru: r.name_ru, en: r.name_en },
      description: { az: r.description_az, ru: r.description_ru, en: r.description_en },
      features: { az: r.features_az || [], ru: r.features_ru || [], en: r.features_en || [] },
      prices: prices
    };
  }).filter(function (p) { return p.prices.length > 0; });

  const cats = (await pool.query("select key, name_az, name_ru, name_en from categories where active = true")).rows;
  const faqs = (await pool.query(
    "select question, answer, language, product_key from site_faqs where active = true order by sort_order limit 300")).rows;
  let settings = {};
  try {
    const s = await pool.query("select value from site_settings where key = 'general'");
    settings = (s.rows[0] && s.rows[0].value) || {};
  } catch (e) { settings = {}; }
  return { products: products, cats: cats, faqs: faqs, settings: settings };
}

// Məhsul adına görə uyğunluq: nadir sözlər (az məhsulda keçən) daha çox bal qazanır
function matchProducts(n, products) {
  const msgTok = tokens(n);
  if (!msgTok.length) return [];
  const df = {};
  products.forEach(function (p) {
    const seen = {};
    [p.name.az, p.name.ru, p.name.en, p.slug].forEach(function (x) {
      tokens(x).forEach(function (w) { seen[w] = true; });
    });
    Object.keys(seen).forEach(function (w) { df[w] = (df[w] || 0) + 1; });
  });
  const scored = products.map(function (p) {
    let score = 0;
    const full = [p.name.az, p.name.ru, p.name.en].map(norm).filter(Boolean);
    full.forEach(function (f) { if (f.length >= 4 && (" " + n + " ").indexOf(" " + f + " ") >= 0) score += 5; });
    const own = {};
    [p.name.az, p.name.ru, p.name.en, p.slug].forEach(function (x) { tokens(x).forEach(function (w) { own[w] = true; }); });
    msgTok.forEach(function (w) {
      if (own[w] && (df[w] || 0) <= 2) score += 2;
      else if (own[w]) score += 0.5;
    });
    return { p: p, score: score };
  }).filter(function (x) { return x.score >= 2; }).sort(function (a, b) { return b.score - a.score; });
  if (!scored.length) return [];
  const top = scored[0].score;
  return scored.filter(function (x) { return x.score >= top - 0.01; }).slice(0, 4).map(function (x) { return x.p; });
}

function matchFaq(n, faqs, lang, productKey) {
  const msgTok = tokens(n);
  if (msgTok.length < 1) return null;
  let best = null, bestScore = 0;
  faqs.forEach(function (f) {
    if (productKey ? f.product_key !== productKey : false) return;
    const q = tokens(f.question);
    if (!q.length) return;
    let hit = 0;
    msgTok.forEach(function (w) { if (q.indexOf(w) >= 0) hit++; });
    const ratio = hit / Math.min(msgTok.length, q.length);
    let score = hit + ratio;
    if (f.language === lang) score += 0.3;
    if (hit >= 2 && ratio >= 0.5 && score > bestScore) { best = f; bestScore = score; }
  });
  return best;
}

function searchByText(n, products, cats) {
  const msgTok = tokens(n).filter(function (w) { return w.length >= 4; });
  if (!msgTok.length) return [];
  const catName = {};
  cats.forEach(function (c) { catName[c.key] = norm([c.name_az, c.name_ru, c.name_en].join(" ")); });
  const res = products.map(function (p) {
    const hay = norm([p.name.az, p.name.ru, p.name.en, p.description.az, p.description.ru, p.description.en,
      (p.features.az || []).join(" "), catName[p.category_key] || ""].join(" "));
    let s = 0;
    msgTok.forEach(function (w) { if (hay.indexOf(w) >= 0) s++; });
    return { p: p, s: s };
  }).filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; });
  if (!res.length) return [];
  const top = res[0].s;
  return res.filter(function (x) { return x.s === top; }).slice(0, 4).map(function (x) { return x.p; });
}

async function reply(pool, text, langIn) {
  const lang = TX[langIn] ? langIn : "az";
  const t = TX[lang];
  const n = norm(text);
  const data = await loadData(pool);
  const products = data.products;
  const words = n.split(" ").filter(Boolean);
  const wa = String(data.settings.whatsapp || "").replace(/\D/g, "");
  const waLine = wa ? mdLink(t.waBtn, "https://wa.me/" + wa) : "";

  // 1) Təşəkkür / salam (qısa mesajlar)
  if (words.length <= 5 && has(n, KW.thanks)) return t.thanks;
  const greeting = words.length <= 5 && has(n, KW.greet);

  // 2) Operator tələbi
  if (has(n, KW.human)) return t.human + (waLine ? "\n" + waLine : "");

  // 2b) "Necəsən?" tipli şəxsi suallar
  if (has(n, KW.wellbeing)) return (greeting ? t.hi + " " : "") + t.wellbeing;

  // 3) Konkret məhsul
  const found = matchProducts(n, products);
  if (found.length === 1) {
    const p = found[0];
    const f = matchFaq(n, data.faqs, lang, p.product_key);
    let out = productDetail(p, lang, t);
    if (f) out = f.answer + "\n\n" + out;
    return out;
  }
  if (found.length > 1) return productList(found, lang, t, t.several);

  // 3b) Botun kim olduğu, sayt haqqında və kömək (məhsul adı yoxdursa)
  if (words.length <= 8 && has(n, KW.identity)) return t.identity;
  if (words.length <= 6 && has(n, KW.about)) return t.about + (waLine ? "\n" + waLine : "");
  if (has(n, KW.help)) return t.help;

  // 4) FAQ
  const faq = matchFaq(n, data.faqs.filter(function (f) { return !f.product_key; }), lang, null);
  if (faq) return faq.answer;

  // 5) Ümumi niyyətlər
  if (has(n, KW.order)) return t.order;
  if (has(n, KW.pay)) return t.pay;
  if (has(n, KW.delivery)) return t.delivery;
  if (has(n, KW.contact)) {
    const lines = [t.contactHead];
    const h = data.settings["hours_" + lang] || data.settings.hours_az;
    if (h) lines.push(t.hours + ": " + h);
    if (waLine) lines.push(waLine);
    if (data.settings.phone) lines.push(data.settings.phone);
    return lines.join("\n");
  }
  if (has(n, KW.price) && products.length) {
    return productList(products.slice(0, 12), lang, t, t.prices) + "\n\n" + mdLink(t.catalog, "products.html");
  }
  if (has(n, KW.list) && products.length) {
    const top = searchByText(n, products, data.cats);
    const show = top.length ? top : products.slice(0, 5);
    return productList(show, lang, t, t.suggest) + "\n\n" + mdLink(t.catalog, "products.html");
  }

  // 6) Mətn üzrə axtarış (kateqoriya / təsvir)
  const found2 = searchByText(n, products, data.cats);
  if (found2.length) return productList(found2, lang, t, t.suggest) + "\n\n" + mdLink(t.catalog, "products.html");

  if (greeting) return t.greet;
  return t.fallback + (products.length ? "\n\n" + productList(products.slice(0, 4), lang, t, t.suggest) : "");
}

module.exports = { reply, TX };
