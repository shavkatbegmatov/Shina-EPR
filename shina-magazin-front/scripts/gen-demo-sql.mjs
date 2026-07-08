// Kanonik katalogdan (demo-catalog.mjs) products SQL fragmentini chiqaradi.
// Natija R__demo_data.sql ichiga qo'yiladi (SVG fayl nomlari bilan 100% mos).
//   node scripts/gen-demo-sql.mjs
import { CATALOG, NEW_BRANDS, NEW_CATEGORIES, fullName, imageUrlFor } from './demo-catalog.mjs';

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const lines = [];

lines.push('-- ─── Yangi brendlar ───');
for (const b of NEW_BRANDS) {
  lines.push(`INSERT INTO brands (name, country, active) SELECT ${q(b.name)}, ${q(b.country)}, true WHERE NOT EXISTS (SELECT 1 FROM brands WHERE name=${q(b.name)});`);
}
lines.push('');
lines.push('-- ─── Yangi kategoriyalar ───');
for (const c of NEW_CATEGORIES) {
  lines.push(`INSERT INTO categories (name, description, active) SELECT ${q(c.name)}, ${q(c.description)}, true WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name=${q(c.name)});`);
}
lines.push('');
lines.push('-- ─── Mavjud mahsulotlarga rasm ───');
for (const it of CATALOG.filter((x) => x.existing)) {
  lines.push(`UPDATE products SET image_url=${q(imageUrlFor(it))} WHERE sku=${q(it.sku)};`);
}
lines.push('');
lines.push('-- ─── Yangi mahsulotlar ───');
for (const it of CATALOG.filter((x) => !x.existing)) {
  const name = fullName(it);
  lines.push(
    `INSERT INTO products (sku, name, brand_id, category_id, width, profile, diameter, load_index, speed_rating, season, purchase_price, selling_price, quantity, min_stock_level, description, image_url, active, created_by)\n` +
    `  SELECT ${q(it.sku)}, ${q(name)}, (SELECT id FROM brands WHERE name=${q(it.brand)}), (SELECT id FROM categories WHERE name=${q(it.category)}), ${it.w}, ${it.p}, ${it.d}, ${q(it.load)}, ${q(it.speed)}, ${q(it.season)}, ${it.purchase}, ${it.price}, ${it.qty}, ${it.min}, ${q(it.desc)}, ${q(imageUrlFor(it))}, true, 1\n` +
    `  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku=${q(it.sku)});`
  );
}

console.log(lines.join('\n'));
