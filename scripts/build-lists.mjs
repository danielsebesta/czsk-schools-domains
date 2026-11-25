import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// --root DIR builds the checkout in DIR (CI runs the base branch's copy of this script on the PR's data)
const rootArg = process.argv.indexOf("--root");
const ROOT = rootArg !== -1 ? path.resolve(process.argv[rootArg + 1]) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "data");
const TS_SRC = path.join(ROOT, "packages", "ts", "src");

const LEVEL_BY_KIND = {
  ms: "preschool",
  jesle: "preschool",
  zs: "primary",
  gymnazium: "secondary",
  sos: "secondary",
  konzervator: "secondary",
  vos: "secondary",
  vs: "he",
  fakulta: "he",
};

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const writeJson = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2) + "\n", "utf8");

function normalizeDomain(raw) {
  return String(raw).trim().toLowerCase().replace(/\.$/, "");
}

// Kindergartens, nurseries, courses and non-schools are never eligible for the discount list.
function notEligible(kind, level) {
  return kind === "ms" || kind === "jesle" || kind === "kurzy" || kind === "not_school" || level === "preschool" || level === "unknown";
}

function main() {
  const blocklist = new Set(readJson(path.join(DATA, "blocklist.json")).map(normalizeDomain).filter(Boolean));
  const customRaw = readJson(path.join(DATA, "custom-domains.json"));
  if (!Array.isArray(customRaw)) throw new Error("data/custom-domains.json must be a JSON array");
  // domains-detailed.json (+ custom-domains.json, blocklist.json) is the single source of truth;
  // domains-all.json, domains.json and domains.txt are outputs only.
  const detailed = readJson(path.join(DATA, "domains-detailed.json"));

  const byDomain = new Map();
  for (const row of detailed) {
    const d = normalizeDomain(row.domain);
    if (!d || blocklist.has(d)) continue;
    byDomain.set(d, { ...row, domain: d, in_discount: row.in_discount === true && !notEligible(row.kind, row.level) });
  }

  // custom-domains.json: adds domains missing from domains-detailed.json; for an existing domain,
  // only the fields set in the entry override the record (unless the domain is on blocklist.json)
  for (const entry of customRaw) {
    const isObj = entry && typeof entry === "object";
    const d = normalizeDomain(isObj ? entry.domain : entry);
    if (!d || blocklist.has(d)) continue;
    const prev = byDomain.get(d);
    const field = (k) => (isObj ? entry[k] : undefined) ?? prev?.[k] ?? null;
    const kind = field("kind") ?? "other_edu";
    const level = (isObj && entry.level) || (isObj && entry.kind ? LEVEL_BY_KIND[kind] : undefined) || prev?.level || LEVEL_BY_KIND[kind] || "other";
    const wanted = isObj && typeof entry.in_discount === "boolean" ? entry.in_discount : prev ? prev.in_discount === true : true;
    const sources = Array.from(new Set([...(prev?.sources ?? []), "community-custom"])).sort();
    byDomain.set(d, {
      domain: d,
      name: field("name"),
      address: field("address"),
      city: field("city"),
      zip: field("zip"),
      ico: field("ico"),
      id: field("id"),
      country: field("country") ?? (d.endsWith(".sk") ? "SK" : "CZ"),
      kind,
      level,
      // a community entry for a new domain is not verified until a maintainer checks it against a register
      confidence: field("confidence") ?? (prev ? 100 : 50),
      verified: prev ? prev.verified === true : false,
      in_discount: wanted && !notEligible(kind, level),
      mx: typeof field("mx") === "boolean" ? field("mx") : null,
      sources,
    });
  }

  const sortedDetailed = Array.from(byDomain.values()).sort((a, b) => a.domain.localeCompare(b.domain, "en"));
  const allList = sortedDetailed.map((r) => r.domain);
  const discountList = sortedDetailed.filter((r) => r.in_discount).map((r) => r.domain);

  writeJson(path.join(DATA, "domains-detailed.json"), sortedDetailed);
  writeJson(path.join(DATA, "domains-all.json"), allList);
  writeJson(path.join(DATA, "domains.json"), discountList);
  fs.writeFileSync(path.join(DATA, "domains.txt"), discountList.join("\n") + "\n", "utf8");
  writeJson(path.join(TS_SRC, "domains.json"), discountList);
  fs.writeFileSync(
    path.join(TS_SRC, "domains-data.ts"),
    `// Auto-generated from data/domains.json — do not edit manually.\nexport const DOMAINS: readonly string[] = ${JSON.stringify(discountList)};\n`,
    "utf8",
  );

  console.log(`Built lists: discount=${discountList.length}, all=${allList.length}, blocklist=${blocklist.size}, custom=${customRaw.length}`);
}

main();
