import { LANGS, DEFAULT_LANG } from './constants.js';

export function normLang(v) {
  return LANGS.includes(v) ? v : DEFAULT_LANG;
}

/** row[`${base}_${lang}`] → yoxdursa AZ → yoxdursa köhnə sütun (məs. site_products.name) */
export function pickLang(row, base, lang) {
  return row[`${base}_${lang}`] || row[`${base}_${DEFAULT_LANG}`] || row[base] || '';
}
