import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Draws the "discount list by type of school" bar chart shown in README.md and README.cs.md,
// in a light and a dark variant. Run it after the data changes: node scripts/render-chart.mjs

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, ".github", "assets");

const LABELS = {
  en: {
    zs: "Primary schools (ZŠ)", sos: "Secondary schools (SŠ, SOŠ, SOU)", zus: "Art schools (ZUŠ)",
    gymnazium: "Grammar schools (gymnázium)", special: "Special schools", ddm: "Leisure-time centres (DDM, SVČ, CVČ)",
    vos: "Higher vocational schools (VOŠ)", vs: "Universities", fakulta: "Faculties", jazykova: "Language schools",
    konzervator: "Conservatories", other_edu: "School facilities",
    CZ: "Czech Republic", SK: "Slovakia", title: "Discount list by type of school", sep: ",",
  },
  cs: {
    zs: "Základní školy (ZŠ)", sos: "Střední školy (SŠ, SOŠ, SOU)", zus: "Základní umělecké školy (ZUŠ)",
    gymnazium: "Gymnázia", special: "Speciální školy", ddm: "Střediska volného času (DDM, SVČ, CVČ)",
    vos: "Vyšší odborné školy (VOŠ)", vs: "Vysoké školy", fakulta: "Fakulty", jazykova: "Jazykové školy",
    konzervator: "Konzervatoře", other_edu: "Školská zařízení",
    CZ: "Česko", SK: "Slovensko", title: "Slevový seznam podle typu školy", sep: " ",
  },
};

const THEMES = {
  light: { text: "#1f2328", muted: "#59636e", CZ: "#0969da", SK: "#80ccff" },
  dark: { text: "#f0f6fc", muted: "#9198a1", CZ: "#4493f8", SK: "#1d4f91" },
};

const records = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "domains-detailed.json"), "utf8"));
const counts = new Map();
for (const r of records) {
  if (!r.in_discount) continue;
  const c = counts.get(r.kind) ?? { CZ: 0, SK: 0 };
  c[r.country] = (c[r.country] ?? 0) + 1;
  counts.set(r.kind, c);
}
const rows = [...counts].map(([kind, c]) => ({ kind, CZ: c.CZ, SK: c.SK, total: c.CZ + c.SK }))
  .sort((a, b) => b.total - a.total || a.kind.localeCompare(b.kind));
const max = Math.max(...rows.map((r) => r.total));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = (n, sep) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep);

const W = 800, LABEL_END = 280, BAR_X = 292, BAR_MAX = 420, TOP = 48, ROW = 30, BAR_H = 18;
const H = TOP + rows.length * ROW + 6;

function svg(lang, theme) {
  const L = LABELS[lang], T = THEMES[theme];
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t">`);
  out.push(`  <title id="t">${esc(L.title)}: ${rows.map((r) => `${esc(L[r.kind] ?? r.kind)} ${num(r.total, L.sep)}`).join(", ")}</title>`);
  out.push(`  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif" font-size="14">`);
  // legend
  let x = BAR_X;
  for (const c of ["CZ", "SK"]) {
    out.push(`    <rect x="${x}" y="12" width="12" height="12" rx="2" fill="${T[c]}"/>`);
    out.push(`    <text x="${x + 18}" y="23" fill="${T.muted}">${esc(L[c])}</text>`);
    x += 18 + L[c].length * 8 + 22;
  }
  rows.forEach((r, i) => {
    const y = TOP + i * ROW;
    const cz = (r.CZ / max) * BAR_MAX, sk = (r.SK / max) * BAR_MAX;
    out.push(`    <text x="${LABEL_END}" y="${y + 14}" text-anchor="end" fill="${T.text}">${esc(L[r.kind] ?? r.kind)}</text>`);
    if (r.CZ) out.push(`    <rect x="${BAR_X}" y="${y}" width="${Math.max(cz, 2).toFixed(1)}" height="${BAR_H}" rx="2" fill="${T.CZ}"/>`);
    if (r.SK) out.push(`    <rect x="${(BAR_X + cz + (r.CZ ? 1 : 0)).toFixed(1)}" y="${y}" width="${Math.max(sk, 2).toFixed(1)}" height="${BAR_H}" rx="2" fill="${T.SK}"/>`);
    out.push(`    <text x="${(BAR_X + cz + sk + 10).toFixed(1)}" y="${y + 14}" fill="${T.muted}">${num(r.total, L.sep)}</text>`);
  });
  out.push(`  </g>`, `</svg>`, ``);
  return out.join("\n");
}

for (const lang of Object.keys(LABELS)) {
  for (const theme of Object.keys(THEMES)) {
    const file = path.join(OUT, `chart-types-${lang}-${theme}.svg`);
    fs.writeFileSync(file, svg(lang, theme), "utf8");
    console.log(path.relative(ROOT, file));
  }
}
