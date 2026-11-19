/* DigiBaku — məhsul detal səhifəsi: müddət seçimi, qiymət, səbət, WhatsApp, sabit panel */
(function () {
  var TX = {
    az: { back: "← Məhsullara qayıt", notFound: "Məhsul tapılmadı.", loadErr: "Məhsul yüklənmədi. Səhifəni yeniləyin.",
      duration: "Müddət", month: "ay", perPrice: "Qiymət", addCart: "Səbətə at", added: "Səbətə əlavə olundu.",
      buyWa: "WhatsApp-la sifariş et", wa: "Salam, bu məhsulu sifariş etmək istəyirəm: ",
      waMonths: "müddət", waPrice: "qiymət", stickyLabel: "Seçilmiş paket", noImg: "Şəkil yoxdur",
      noFeat: "", pickMonth: "Müddəti seçin" },
    ru: { back: "← Назад к товарам", notFound: "Товар не найден.", loadErr: "Не удалось загрузить товар. Обновите страницу.",
      duration: "Срок", month: "мес.", perPrice: "Цена", addCart: "В корзину", added: "Добавлено в корзину.",
      buyWa: "Заказать в WhatsApp", wa: "Здравствуйте, хочу заказать этот товар: ",
      waMonths: "срок", waPrice: "цена", stickyLabel: "Выбранный пакет", noImg: "Нет изображения",
      noFeat: "", pickMonth: "Выберите срок" },
    en: { back: "← Back to products", notFound: "Product not found.", loadErr: "Product could not be loaded. Please refresh.",
      duration: "Duration", month: "mo", perPrice: "Price", addCart: "Add to cart", added: "Added to cart.",
      buyWa: "Order via WhatsApp", wa: "Hello, I would like to order this product: ",
      waMonths: "duration", waPrice: "price", stickyLabel: "Selected plan", noImg: "No image",
      noFeat: "", pickMonth: "Choose duration" }
  };

  var lang = DB.lang;
  var t = TX[lang] || TX.az;
  var WA = "https://wa.me/994513626349";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var slug = new URLSearchParams(location.search).get("slug") || "";
