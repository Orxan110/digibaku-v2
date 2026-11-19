import { buildCatalog } from '../../server/services/catalog.js';
import { normLang } from '../../server/i18n.js';
import { getCached, setCached } from '../../server/cache.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    const lang = normLang(req.query.lang);
    let data = getCached(lang);

    if (!data) {
      data = await buildCatalog(lang);
      setCached(lang, data);
    }

    res.setHeader('Cache-Control', 'public, max-age=30');
    return res.status(200).json(data);
  } catch (error) {
    console.error('Catalog error:', error);
    return res.status(500).json({
      error: 'catalog_error',
      message: error.message
    });
  }
}
