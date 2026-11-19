import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priceList, productView } from '../server/services/pricing.js';

test('0 və boş qiymət heç vaxt göstərilmir', () => {
  const pl = priceList({ price_1_month: 7, price_3_month: 0, price_12_month: null });
  assert.deepEqual(pl.map((p) => p.months), [1]);
  assert.equal(priceList(null).length, 0);
});

test('endirim yalnız aktiv və ucuz olduqda tətbiq olunur', () => {
  const pl = priceList({
    price_1_month: 7, sale_1_price: 5, sale_1_active: true,
    price_2_month: 13, sale_2_price: 20, sale_2_active: true,
  });
  assert.equal(pl[0].current_price, 5);
  assert.equal(pl[1].current_price, 13);
  assert.equal(pl[1].sale_price, null);
});

test('qiyməti olmayan məhsulda prices boşdur', () => {
  assert.deepEqual(productView({ product_key: 'x', name_az: 'X' }, null, 'az').prices, []);
});

test('ad dil fallback-i ilə seçilir', () => {
  const p = { product_key: 'n', name_az: 'Netflix', name_ru: 'Нетфликс' };
  assert.equal(productView(p, null, 'ru').name, 'Нетфликс');
  assert.equal(productView(p, null, 'en').name, 'Netflix');
});
