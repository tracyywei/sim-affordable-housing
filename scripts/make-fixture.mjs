// Writes FAKE fixture data (public/data/fixture). Never shipped: lib/data.ts USE_FIXTURE=false in the demo.
import fs from 'node:fs';
const F = [null, .70, .80, .90, 1.00, 1.08, 1.16, 1.24, 1.32];
const r50 = x => 50 * Math.round(x / 50);
const limit = s => r50(0.8 * r50(162100 * F[Math.min(Math.max(s, 1), 8)]));
const br = s => s <= 1 ? 0 : s <= 3 ? 1 : s <= 5 ? 2 : 3;
const rent = b => 0.3 * limit(b + 1) / 12;
const floor = b => r50(24 * rent(b));
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const women = [];
const mk = (status, i, gap = false) => {
  const size = 1 + Math.floor(rnd() * 3);
  const b = br(size);
  const income = status === 'too_much' ? limit(size) + 5000 + Math.round(rnd() * 60000)
    : status === 'too_little' ? Math.round(rnd() * (floor(b) - 8000)) + 5000
    : floor(b) + Math.round(rnd() * (limit(size) - floor(b)));
  const rentMonthly = Math.round(1500 + rnd() * 2500);
  const rentShare = gap ? 0.32 + rnd() * 0.1 : Math.round(rentMonthly * 12 / income * 1000) / 1000;
  return { id: `w${i}`, serial: `FIX${i}`, size, kids: size > 1 ? size - 1 : 0, income, age: 22 + Math.floor(rnd() * 55),
    rentMonthly, rentShare: Math.round(rentShare * 1000) / 1000, status, gap, occp: null, persona: null,
    homeBedrooms: b, limit: limit(size), floor: floor(b) };
};
for (let i = 0; i < 100; i++) women.push(mk(i < 38 ? 'too_much' : i < 65 ? 'too_little' : 'qualifies', i, i < 21));
const P = {
  Linh: { i: 40, size: 3, kids: 2, income: 52000, age: 38, rentShare: 0.553, neighborhood: 'Excelsior', job: 'Home health aide' },
  Rosa: { i: 41, size: 1, kids: 0, income: 31000, age: 67, rentShare: 0.62, neighborhood: 'Mission', job: 'Retired' },
  Ana: { i: 70, size: 1, kids: 0, income: 70000, age: 29, rentShare: 0.41, neighborhood: 'Sunset/Parkside', job: 'Preschool teacher' },
  Priya: { i: 0, size: 1, kids: 0, income: 98000, age: 33, rentShare: 0.36, neighborhood: 'Mission Bay', job: 'Lab technician' },
};
const personas = {};
for (const [name, p] of Object.entries(P)) {
  const w = women[p.i];
  Object.assign(w, { size: p.size, kids: p.kids, income: p.income, age: p.age, rentShare: p.rentShare,
    rentMonthly: Math.round(p.income * p.rentShare / 12), persona: name, homeBedrooms: br(p.size), limit: limit(p.size), floor: floor(br(p.size)) });
  personas[name] = { ...w, neighborhood: p.neighborhood, job: p.job };
}
const meta = { counts: { too_much: 38, too_little: 27, qualifies: 35 }, gapCount: 21, qualifiers: 78900, womenShareOfQualifiers: 0.3712,
  rent: Object.fromEntries([0,1,2,3].map(b => [b, Math.round(rent(b))])), floor: Object.fromEntries([0,1,2,3].map(b => [b, floor(b)])),
  limit: Object.fromEntries([1,2,3,4,5,6,7,8].map(s => [s, limit(s)])), forScale: { affordableHomes: 999, year: 2099 }, synthetic: true };
const c = { too_much: 0, too_little: 0, qualifies: 0 }; women.forEach(w => c[w.status]++);
console.log('fixture counts', c, 'gap', women.filter(w => w.gap).length, meta.rent, meta.floor);
fs.writeFileSync('public/data/fixture/women100.json', JSON.stringify(women, null, 1));
fs.writeFileSync('public/data/fixture/personas.json', JSON.stringify(personas, null, 1));
fs.writeFileSync('public/data/fixture/meta.json', JSON.stringify(meta, null, 1));
