#!/usr/bin/env node
// Validates the data files (and, unless --skip-ts, builds and tests the TS package).
//
//   node scripts/validate-pr.mjs [--root DIR] [--base GIT_REF] [--maintainer-approved] [--skip-dns] [--skip-ts]
//
// --root DIR             validate the checkout in DIR (CI runs the base branch's copy of this script on the PR's data)
// --base GIT_REF         compare with GIT_REF: DNS-check added domains, refuse blocklist removals, reclassifications
//                        of existing records and very large additions unless --maintainer-approved is given
import { execFileSync, execSync } from "node:child_process";
import dns from "node:dns/promises";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkDomainDns } from "./check-mx.mjs";
import { isPublicSuffix } from "./psl.mjs";

function parseArgs(argv) {
  const opts = { root: null, base: null, domains: [], skipDns: false, skipTs: false, maintainerApproved: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root") opts.root = argv[++i];
    else if (a === "--base") opts.base = argv[++i];
    else if (a === "--domains") opts.domains = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--skip-dns") opts.skipDns = true;
    else if (a === "--skip-ts") opts.skipTs = true;
    else if (a === "--maintainer-approved") opts.maintainerApproved = true;
    else throw new Error(`unknown argument ${a}`);
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
const ROOT = opts.root ? path.resolve(opts.root) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "data");
const TS_PKG = path.join(ROOT, "packages", "ts");
const HOST_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))*\.[a-z0-9-]*[a-z][a-z0-9-]*$/;
const ICO_RE = /^\d{8}$/;
const ID_RE = { CZ: /^6\d{8}$/, SK: /^100\d{6}$/ }; // CZ RED_IZO, SK EDUID
const ZIP_RE = { CZ: /^[1-7]\d{4}$/, SK: /^[089]\d{4}$/ };
const RECORD_KEYS = ["domain", "name", "address", "city", "zip", "ico", "id", "country", "kind", "level", "confidence", "verified", "in_discount", "mx", "sources"];
const CUSTOM_KEYS = new Set(["domain", "name", "address", "city", "zip", "ico", "id", "country", "kind", "level", "confidence", "in_discount", "mx"]);
const LEVEL_BY_KIND = {
  ms: "preschool", jesle: "preschool", zs: "primary", gymnazium: "secondary", sos: "secondary",
  konzervator: "secondary", vos: "secondary", vs: "he", fakulta: "he",
};
const KINDS = new Set([...Object.keys(LEVEL_BY_KIND), "zus", "ddm", "special", "jazykova", "other_edu", "kurzy", "not_school"]);
const strOrNull = (v) => v === null || (typeof v === "string" && v.trim() === v && v.length > 0);
const VALID_COUNTRIES = new Set(["CZ", "SK"]);
const MAX_ADDED_WITHOUT_APPROVAL = 200;

// Free-mail, alias, tenant and free-subdomain providers: the domain itself and every subdomain are rejected.
// This list is part of the trusted CI script, so a PR cannot weaken it by editing data/blocklist.json.
const BLOCKED_ROOTS = new Set([
  "gmail.com", "googlemail.com", "gmail.cz", "googlegroups.com",
  "outlook.com", "outlook.cz", "outlook.sk", "hotmail.com", "hotmail.cz", "hotmail.sk", "live.com", "live.cz", "msn.com",
  "onmicrosoft.com", "yahoo.com", "yahoo.cz", "ymail.com", "aol.com", "icloud.com", "me.com", "mac.com",
  "privaterelay.appleid.com", "proton.me", "protonmail.com", "protonmail.ch", "pm.me",
  "tuta.io", "tuta.com", "tutanota.com", "tutanota.de", "duck.com", "mozmail.com", "relay.firefox.com",
  "addy.io", "anonaddy.com", "anonaddy.me", "simplelogin.com", "simplelogin.co", "slmail.me", "aleeas.com",
  "seznam.cz", "email.cz", "post.cz", "spoluzaci.cz", "centrum.cz", "atlas.cz", "volny.cz", "tiscali.cz", "iol.cz",
  "quick.cz", "t-email.cz", "o2active.cz",
  "azet.sk", "zoznam.sk", "centrum.sk", "atlas.sk", "post.sk", "pobox.sk", "inmail.sk", "stonline.sk",
  "gmx.com", "gmx.net", "gmx.de", "gmx.at", "mail.com", "zoho.com", "zohomail.eu", "yandex.com", "yandex.ru", "mail.ru",
  "fastmail.com", "mailbox.org", "posteo.de", "hey.com",
  "mailinator.com", "guerrillamail.com", "yopmail.com", "temp-mail.org", "10minutemail.com", "trashmail.com",
  "eu.org", "duckdns.org", "github.io", "gitlab.io", "netlify.app", "vercel.app", "pages.dev", "workers.dev",
  "edu.cz", "gov.cz", "gov.sk",
]);
// Shared hosting / platform roots: the root itself is rejected, school subdomains under it are allowed.
const SHARED_ROOTS = new Set([
  "edu.sk", "edupage.org", "edupage.sk", "webnode.cz", "webnode.sk", "webnode.com", "webnode.page",
  "estranky.cz", "estranky.sk", "w1.cz", "ic.cz", "wbs.cz", "blog.cz", "mypage.cz", "rajce.net", "plzen-edu.cz",
  "szm.sk", "wixsite.com", "wix.com", "wordpress.com", "blogspot.com", "weebly.com", "webs.com", "google.com",
]);
const BAD_DISCOUNT_KINDS = new Set(["ms", "jesle", "kurzy", "not_school"]);
const BAD_DISCOUNT_LEVELS = new Set(["preschool", "not_school", "unknown"]);
const PARKING_IPS = new Set(["104.247.81.99"]); // Bodis domain parking
const INSTALL_SCRIPTS = ["preinstall", "install", "postinstall", "prepare", "preprepare", "postprepare"];
const DEP_FIELDS = ["dependencies", "optionalDependencies", "peerDependencies", "bundleDependencies", "bundledDependencies"];

function fail(msg) {
  console.error("ERROR:", msg);
  process.exitCode = 1;
}

const needsApproval = (msg) => {
  if (opts.maintainerApproved) console.log(`NOTE (maintainer-approved): ${msg}`);
  else fail(`${msg} — a maintainer must review this and add the "maintainer-approved" label`);
};

const preview = (arr, n = 20) => arr.slice(0, n).join(", ") + (arr.length > n ? `, … (${arr.length} total)` : "");

function validateDomainList(name, list) {
  if (!Array.isArray(list)) {
    fail(`${name} must be a JSON array`);
    return;
  }
  const seen = new Set();
  for (let i = 0; i < list.length; i++) {
    const raw = list[i];
    if (typeof raw !== "string") {
      fail(`${name}[${i}] is not a string`);
      continue;
    }
    if (raw !== raw.trim().toLowerCase() || raw.length > 253 || !HOST_RE.test(raw) || raw.startsWith("www.")) {
      fail(`${name}[${i}] invalid domain format: ${JSON.stringify(raw)}`);
    }
    if (seen.has(raw)) fail(`${name} contains duplicate: ${raw}`);
    seen.add(raw);
    if (i > 0 && typeof list[i - 1] === "string" && list[i - 1].localeCompare(raw, "en") > 0) {
      fail(`${name} is not sorted alphabetically near ${list[i - 1]} / ${raw}`);
    }
  }
}

/** Returns why a domain may not be listed, or null. */
function blockReason(domain, blockSet) {
  if (blockSet.has(domain)) return `on data/blocklist.json`;
  if (SHARED_ROOTS.has(domain)) return `shared hosting/platform root`;
  if (isPublicSuffix(domain)) return `public suffix (anyone can register names under it)`;
  const parts = domain.split(".");
  for (let i = 0; i < parts.length - 1; i++) {
    const parent = parts.slice(i).join(".");
    if (BLOCKED_ROOTS.has(parent)) return `free-mail / alias / free-subdomain provider ${parent}`;
  }
  return null;
}

function resolveBase(baseRef) {
  try {
    execFileSync("git", ["rev-parse", "--verify", "--quiet", `${baseRef}^{commit}`], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
    return true;
  } catch {
    fail(`cannot resolve base ref ${JSON.stringify(baseRef)} (fetch it first, e.g. actions/checkout with fetch-depth: 0)`);
    return false;
  }
}

/** JSON content of a file at the base ref, or null when the file does not exist there. */
function readBaseJson(baseRef, rel) {
  let raw;
  try {
    raw = execFileSync("git", ["show", `${baseRef}:${rel}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  } catch {
    return null;
  }
  return JSON.parse(raw);
}

const domainOf = (x) => (typeof x === "string" ? x : x?.domain);

async function main() {
  const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

  const disc = read(path.join(DATA, "domains.json"));
  const all = read(path.join(DATA, "domains-all.json"));
  const detailed = read(path.join(DATA, "domains-detailed.json"));
  const customRaw = read(path.join(DATA, "custom-domains.json"));
  const blocklist = read(path.join(DATA, "blocklist.json"));
  const tsDisc = read(path.join(TS_PKG, "src", "domains.json"));
  const txtLines = fs.readFileSync(path.join(DATA, "domains.txt"), "utf8").trimEnd().split("\n");
  if (!Array.isArray(customRaw)) throw new Error("data/custom-domains.json must be a JSON array");
  if (!Array.isArray(detailed)) throw new Error("data/domains-detailed.json must be a JSON array");
  const custom = customRaw.map(domainOf);

  validateDomainList("data/domains.json", disc);
  validateDomainList("data/domains.txt", txtLines);
  validateDomainList("data/domains-all.json", all);
  validateDomainList("data/custom-domains.json", custom);
  validateDomainList("data/blocklist.json", blocklist);
  validateDomainList("packages/ts/src/domains.json", tsDisc);

  for (const entry of customRaw) {
    if (entry === null || (typeof entry !== "string" && typeof entry !== "object") || Array.isArray(entry)) {
      fail(`data/custom-domains.json entries must be domain strings or objects (got ${JSON.stringify(entry)})`);
    } else if (typeof entry === "object") {
      const extra = Object.keys(entry).filter((k) => !CUSTOM_KEYS.has(k));
      if (extra.length) fail(`data/custom-domains.json ${entry.domain}: unknown field(s) ${extra.join(", ")}`);
      if (entry.kind !== undefined && !KINDS.has(entry.kind)) fail(`data/custom-domains.json ${entry.domain}: unknown kind ${JSON.stringify(entry.kind)}`);
    }
  }

  if (JSON.stringify(disc) !== JSON.stringify(txtLines)) fail("data/domains.json and data/domains.txt are out of sync");
  if (JSON.stringify(disc) !== JSON.stringify(tsDisc)) fail("data/domains.json and packages/ts/src/domains.json are out of sync");

  const allSet = new Set(all);
  const discSet = new Set(disc);
  for (const d of disc) {
    if (!allSet.has(d)) fail(`data/domains.json entry ${d} missing from data/domains-all.json`);
  }
  if (JSON.stringify(detailed.map((r) => r?.domain)) !== JSON.stringify(all)) {
    fail("data/domains-detailed.json domains differ from data/domains-all.json (run node scripts/build-lists.mjs)");
  }
  const detailedDiscount = [];
  for (const row of detailed) {
    if (!row || typeof row.domain !== "string" || row.domain.length > 253 || !HOST_RE.test(row.domain)) {
      fail(`data/domains-detailed.json contains invalid row: ${JSON.stringify(row?.domain)}`);
      continue;
    }
    if (!VALID_COUNTRIES.has(row.country)) {
      fail(`data/domains-detailed.json ${row.domain} invalid country=${JSON.stringify(row.country)}`);
    }
    if (row.ico !== undefined && row.ico !== null && !ICO_RE.test(String(row.ico))) {
      fail(`data/domains-detailed.json ${row.domain} invalid ico=${JSON.stringify(row.ico)}`);
    }
    if (row.id !== undefined && row.id !== null && !ID_RE[row.country]?.test(String(row.id))) {
      fail(`data/domains-detailed.json ${row.domain} invalid id=${JSON.stringify(row.id)}`);
    }
    if (JSON.stringify(Object.keys(row)) !== JSON.stringify(RECORD_KEYS)) {
      fail(`data/domains-detailed.json ${row.domain} keys must be exactly ${RECORD_KEYS.join(", ")} in this order`);
    }
    for (const k of ["name", "address", "city"]) {
      if (!strOrNull(row[k])) fail(`data/domains-detailed.json ${row.domain} ${k} must be a trimmed non-empty string or null`);
    }
    if (row.zip !== null && !ZIP_RE[row.country]?.test(String(row.zip))) {
      fail(`data/domains-detailed.json ${row.domain} invalid zip=${JSON.stringify(row.zip)} for ${row.country}`);
    }
    if (!KINDS.has(row.kind)) fail(`data/domains-detailed.json ${row.domain} unknown kind=${JSON.stringify(row.kind)}`);
    if (LEVEL_BY_KIND[row.kind] && row.level !== LEVEL_BY_KIND[row.kind]) {
      fail(`data/domains-detailed.json ${row.domain} level=${row.level} does not match kind=${row.kind}`);
    }
    if (typeof row.confidence !== "number" || row.confidence < 0 || row.confidence > 100) {
      fail(`data/domains-detailed.json ${row.domain} confidence must be a number 0-100`);
    }
    if (typeof row.verified !== "boolean" || typeof row.in_discount !== "boolean") {
      fail(`data/domains-detailed.json ${row.domain} verified / in_discount must be booleans`);
    }
    if (row.mx !== null && typeof row.mx !== "boolean") fail(`data/domains-detailed.json ${row.domain} mx must be true, false or null`);
    if (!Array.isArray(row.sources) || row.sources.some((x) => typeof x !== "string")) {
      fail(`data/domains-detailed.json ${row.domain} sources must be an array of strings`);
    }
    if (row.in_discount) {
      detailedDiscount.push(row.domain);
      if (BAD_DISCOUNT_KINDS.has(row.kind) || BAD_DISCOUNT_LEVELS.has(row.level)) {
        fail(`data/domains-detailed.json has ineligible discount entry ${row.domain} (kind=${row.kind}, level=${row.level})`);
      }
      if (!discSet.has(row.domain)) fail(`data/domains-detailed.json in_discount=true for ${row.domain} missing from data/domains.json`);
    }
  }
  if (detailedDiscount.length !== disc.length) {
    fail(`data/domains-detailed.json in_discount count (${detailedDiscount.length}) != data/domains.json (${disc.length})`);
  }

  const tsDataFile = fs.readFileSync(path.join(TS_PKG, "src", "domains-data.ts"), "utf8");
  if (!tsDataFile.includes(JSON.stringify(disc))) {
    fail("packages/ts/src/domains-data.ts is out of sync with data/domains.json (run node scripts/build-lists.mjs)");
  }

  const pkg = read(path.join(TS_PKG, "package.json"));
  if (pkg.name !== "czsk-schools-domains") fail(`packages/ts/package.json name must be czsk-schools-domains (got ${pkg.name})`);
  for (const f of DEP_FIELDS) {
    if (pkg[f] && Object.keys(pkg[f]).length > 0) fail(`packages/ts/package.json must not have ${f} (zero runtime dependencies)`);
  }
  for (const s of INSTALL_SCRIPTS) {
    if (pkg.scripts?.[s] !== undefined) fail(`packages/ts/package.json must not define an install-time "${s}" script`);
  }

  const blockSet = new Set(blocklist);
  for (const [label, arr] of [["data/domains.json", disc], ["data/domains-all.json", all], ["data/custom-domains.json", custom]]) {
    for (const d of arr) {
      if (typeof d !== "string") continue;
      const why = blockReason(d, blockSet);
      if (why) fail(`${label} contains ${d}: ${why}`);
    }
  }

  // Changes against the base branch: these need a maintainer's eye even when the data is well-formed
  let added = [];
  if (opts.base && resolveBase(opts.base)) {
    const baseBlock = readBaseJson(opts.base, "data/blocklist.json") ?? [];
    const removed = baseBlock.filter((d) => !blockSet.has(d));
    if (removed.length) needsApproval(`removes ${removed.length} blocklist entr${removed.length === 1 ? "y" : "ies"}: ${preview(removed)}`);

    const baseDetailed = new Map((readBaseJson(opts.base, "data/domains-detailed.json") ?? []).map((r) => [r?.domain, r]));
    const reclassified = [];
    for (const row of detailed) {
      const prev = baseDetailed.get(row?.domain);
      if (prev && ((row.in_discount && !prev.in_discount) || row.kind !== prev.kind)) reclassified.push(row.domain);
    }
    if (reclassified.length) {
      needsApproval(`changes the kind or adds to the discount list ${reclassified.length} existing record(s): ${preview(reclassified)}`);
    }

    for (const entry of customRaw) {
      const d = domainOf(entry);
      if (typeof d === "string" && !baseDetailed.has(d) && (typeof entry !== "object" || !entry.kind || !entry.name)) {
        fail(`data/custom-domains.json: new domain ${d} must be an object with at least "domain", "name" and "kind" (see AGENTS.md)`);
      }
    }

    const prevAll = new Set(baseDetailed.keys());
    for (const rel of ["data/domains-all.json", "data/custom-domains.json"]) {
      const baseList = readBaseJson(opts.base, rel);
      if (Array.isArray(baseList)) for (const x of baseList) prevAll.add(domainOf(x));
    }
    added = [...new Set([...all, ...custom])].filter((d) => typeof d === "string" && !prevAll.has(d));
    if (added.length > MAX_ADDED_WITHOUT_APPROVAL) needsApproval(`adds ${added.length} domains (more than ${MAX_ADDED_WITHOUT_APPROVAL})`);
  }

  if (!opts.skipDns) {
    const toCheck = opts.domains.length ? opts.domains : added;
    if (toCheck.length > 0) {
      console.log(`Checking DNS for ${toCheck.length} newly added domain(s)...`);
      for (const d of toCheck) {
        const res = await checkDomainDns(d, 6000);
        if (res.status === "dead_no_dns") {
          fail(`Newly added domain ${d} has no active MX, A, or AAAA record (${res.error})`);
        } else {
          const ips = [];
          for (const h of [d, `www.${d}`]) {
            try { ips.push(...(await dns.resolve4(h))); } catch {}
          }
          const parked = ips.find((ip) => PARKING_IPS.has(ip));
          if (parked) fail(`Newly added domain ${d} resolves to known domain-parking IP ${parked}`);
          else console.log(`  DNS OK: ${d} (${res.status})`);
        }
      }
    } else {
      console.log("No newly added domains detected for DNS check.");
    }
  }

  if (!opts.skipTs) {
    if (process.platform === "win32") {
      execSync("npm.cmd run build", { cwd: TS_PKG, stdio: "inherit" });
      execSync("npm.cmd test", { cwd: TS_PKG, stdio: "inherit" });
    } else {
      execFileSync("npm", ["run", "build"], { cwd: TS_PKG, stdio: "inherit" });
      execFileSync("npm", ["test"], { cwd: TS_PKG, stdio: "inherit" });
    }
  }

  if (process.exitCode) process.exit(process.exitCode);
  console.log(`Validation passed! discount=${disc.length}, all=${all.length}, blocklist=${blocklist.length}`);
}

main().catch((err) => {
  console.error("ERROR:", err?.message ?? err);
  process.exit(1);
});
