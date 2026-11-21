const { pool } = require("./_db");

// Yalnız aktiv məhsullar. Endirim varsa: price = satış qiyməti, old = əvvəlki qiymət.
// Həmçinin ana səhifədə göstəriləcək təsdiqlənmiş rəylər (reviews).
const MONTHS = [1, 2, 3, 6, 12];

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "public, s-maxage=10, stale-while-revalidate=60");
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });
  try {
    const cats = await pool.query(
      `select key, name_az, name_ru, name_en, icon, sort_order
       from categories where active = true order by sort_order, name_az`
    );
    const prods = await pool.query(
      `select p.product_key, p.name_az, p.name_ru, p.name_en, p.slug, p.category_key,
              p.description_az, p.description_ru, p.description_en,
              p.features_az, p.features_ru, p.features_en, p.image_url, p.sort_order,
              pp.price_1_month, pp.price_2_month, pp.price_3_month, pp.price_6_month, pp.price_12_month,
              pp.sale_1_price, pp.sale_2_price, pp.sale_3_price, pp.sale_6_price, pp.sale_12_price,
              pp.sale_1_active, pp.sale_2_active, pp.sale_3_active, pp.sale_6_active, pp.sale_12_active
       from site_products p
       left join product_prices pp on pp.product_key = p.product_key
       where p.active = true
       order by p.sort_order, p.name_az`
    );
    const reviews = await pool.query(
      `select author_name, rating, body_az, body_ru, body_en, review_date
       from reviews
       where status = 'approved' and show_on_home = true
       order by sort_order, review_date desc, created_at desc
       limit 12`
    );

    const products = prods.rows.map(r => {
      const prices = [];
      MONTHS.forEach(m => {
        const base = Number(r[`price_${m}_month`]);
        const sale = Number(r[`sale_${m}_price`]);
        const saleOn = r[`sale_${m}_active`] === true && sale > 0;
        if (saleOn && base > 0 && sale < base) {
          prices.push({ months: m, price: Number(sale.toFixed(2)), old: Number(base.toFixed(2)) });
        } else if (base > 0) {
          prices.push({ months: m, price: Number(base.toFixed(2)), old: null });
        }
      });
      return {
        product_key: r.product_key,
        slug: r.slug || r.product_key,
        category_key: r.category_key,
        name: { az: r.name_az || r.name_en, ru: r.name_ru, en: r.name_en },
        description: { az: r.description_az, ru: r.description_ru, en: r.description_en },
        features: { az: r.features_az || [], ru: r.features_ru || [], en: r.features_en || [] },
        image_url: r.image_url,
        prices
      };
    }).filter(p => p.prices.length > 0);

    return res.status(200).json({
      ok: true,
      categories: cats.rows,
      products,
      reviews: reviews.rows
    });
  } catch (e) {
    console.error("products:", e);
    return res.status(500).json({ ok: false, error: "Məhsullar yüklənmədi." });
  }
};
