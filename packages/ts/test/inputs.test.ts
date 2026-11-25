// Everything a user can type (or an attacker can try): the corpus in cases.ts, property-based fuzzing against
// the WHATWG URL parser as a reference, catastrophic-backtracking (ReDoS) budgets, odd JavaScript values,
// createChecker edge cases, the data itself and the examples printed in README.md and README.cs.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { createChecker, extractDomain, isSchoolDomain, matchSchoolDomain, schoolDomains } from "../dist/esm/index.js";
import { CASES, SKIP, fuzzInputs } from "./cases.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const readJson = (rel: string) => JSON.parse(readFileSync(path.join(ROOT, rel), "utf8"));
const LIST = new Set<string>(schoolDomains);
const HOSTNAME = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
const show = (s: string) => (s.length > 80 ? JSON.stringify(s.slice(0, 80)) + `…(${s.length})` : JSON.stringify(s));

// ---------- the corpus ----------

for (const [group, cases] of Object.entries(CASES)) {
  test(`corpus: ${group}`, () => {
    const wrong: string[] = [];
    for (const [input, host, match] of cases) {
      const h = extractDomain(input);
      const m = matchSchoolDomain(input);
      const is = isSchoolDomain(input);
      if ((host !== SKIP && h !== host) || m !== match || is !== (match !== null)) {
        wrong.push(`${show(input)}: host ${h} (want ${host === SKIP ? "any" : host}), match ${m} (want ${match})`);
      }
    }
    assert.deepEqual(wrong, []);
  });
}

// ---------- properties that must hold for any input ----------

const SPECIAL_SCHEMES = new Set(["http", "https", "ws", "wss", "ftp"]);

function whatwgHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/\.$/, "") || null;
  } catch {
    return null;
  }
}

// Node.js versions disagree on ASCII labels that start with "xn--" but are not valid punycode
// ("xn--kla-f6.cz"): Node.js 22 rejects them, Node.js 24 passes them through. The package (and every
// example) passes an ASCII host through unchanged on any runtime. Such a label cannot be a listed domain
// (the lists hold no "xn--" domain), so it only ever matches as a subdomain of a listed school domain.
function sameHost(ref: string | null, host: string): boolean {
  if (ref === host) return true;
  return ref === null && /(^|\.)xn--/.test(host) && whatwgHost(`http://${host}`) === null;
}

/** The address part the way a mail program sees it: "Name <addr>" -> addr, "mailto:addr" -> addr. */
function unwrap(input: string): string {
  let s = input.trim().toLowerCase();
  const lt = s.lastIndexOf("<");
  if (lt !== -1 && s.endsWith(">")) s = s.slice(lt + 1, -1).trim();
  return s.startsWith("mailto:") && !s.startsWith("mailto://") ? s.slice(7) : s;
}

function violations(input: string): string[] {
  let h: string | null, m: string | null, is: boolean;
  try {
    h = extractDomain(input);
    m = matchSchoolDomain(input);
    is = isSchoolDomain(input);
  } catch (e) {
    return [`throws ${(e as Error).message}`];
  }
  const v: string[] = [];
  if (is !== (m !== null)) v.push("isSchoolDomain and matchSchoolDomain disagree");
  if (h !== null) {
    if (typeof h !== "string" || !HOSTNAME.test(h) || !/[a-z]/.test(h.slice(h.lastIndexOf(".") + 1))) v.push(`invalid host ${h}`);
    else if (extractDomain(h) !== h) v.push(`host ${h} does not extract to itself`);
  }
  if (m !== null) {
    if (h === null || !(h === m || h.endsWith("." + m))) v.push(`match ${m} is neither the host ${h} nor its parent`);
    if (!LIST.has(m)) v.push(`match ${m} is not in the list`);
  } else if (h !== null) {
    const labels = h.split(".");
    for (let i = 0; i < labels.length - 1; i++) {
      if (LIST.has(labels.slice(i).join("."))) v.push(`missed listed parent ${labels.slice(i).join(".")}`);
    }
  }
  if (h === null) return v;

  // reference: where would the mail / the browser actually go?
  const s = unwrap(input);
  const scheme = /^([a-z][a-z0-9+.-]*):\/\//.exec(s);
  if (scheme) {
    if (SPECIAL_SCHEMES.has(scheme[1]!)) {
      const ref = whatwgHost(s) ?? whatwgHost(s.replace(/^([a-z][a-z0-9+.-]*:\/\/[^/?#]*?):\d*(?=[/?#]|$)/, "$1"));
      if (!sameHost(ref, h)) v.push(`URL host ${h}, but the WHATWG URL parser says ${ref}`);
    }
  } else if (s.includes("@")) {
    const parts = s.split("@");
    if (parts.length !== 2) v.push("accepted an address with several @");
    const [local = "", domain = ""] = parts;
    // atext (RFC 5322) plus "." and non-ASCII letters; nothing a mailer could read as a route, list or comment
    if (/[\s"(),:;<>[\]\\/?#@\u0000-\u001f\u007f-\u009f]/u.test(local)) v.push(`accepted local part ${JSON.stringify(local)}`);
    const ref = whatwgHost("http://" + domain);
    if (!sameHost(ref, h)) v.push(`address host ${h}, but its domain part ${JSON.stringify(domain)} is ${ref}`);
  } else {
    const authority = (s.split(/[/?#]/)[0] ?? "").replace(/:\d*$/, "");
    const ref = whatwgHost("http://" + authority);
    if (!sameHost(ref, h)) v.push(`domain ${h}, but the WHATWG URL parser says ${ref}`);
  }
  return v;
}

test("fuzz: 30 000 generated inputs never throw and agree with the reference parsers", () => {
  const found: string[] = [];
  for (const input of fuzzInputs(20261125, 30000)) {
    for (const v of violations(input)) found.push(`${show(input)}: ${v}`);
  }
  assert.deepEqual(found.slice(0, 25), [], `${found.length} violations`);
});

test("fuzz: every corpus input also satisfies the properties", () => {
  const found: string[] = [];
  for (const [input] of Object.values(CASES).flat()) {
    for (const v of violations(input)) found.push(`${show(input)}: ${v}`);
  }
  assert.deepEqual(found, []);
});

test("fuzz: a listed domain mixed with an attacker domain is matched only when the mail really goes there", () => {
  const school = ["zcu.cz", "student.zcu.cz", "ZCU.CZ", "zcu.cz."];
  const evil = ["evil.example", "evil.example.", "zcu.cz.evil.example"];
  const seps = ["@", "/@", "?@", "#@", "\\@", ",", ";", ":", " ", "<", ">", "(", ")", '"', "%40", "%2f@", "\uff20", "\uff0f@",
    "\u3002", "\u0000@", "\n", "@@", "!", "%", "/", "#", "?", ":@", "@:"];
  const prefixes = ["", "x@", "mailto:", "https://", "http://x@", "<", '"', "Name <"];
  const suffixes = ["", ">", '"', "/", "?x", "#x", "."];
  const found: string[] = [];
  for (const p of prefixes) for (const a of school) for (const sep of seps) for (const b of evil) for (const q of suffixes) {
    for (const input of [`${p}${a}${sep}${b}${q}`, `${p}${b}${sep}${a}${q}`]) {
      for (const v of violations(input)) found.push(`${show(input)}: ${v}`);
    }
  }
  assert.deepEqual(found.slice(0, 25), [], `${found.length} violations`);
});

// ---------- catastrophic backtracking ----------

test("no catastrophic backtracking: 2 KB adversarial inputs finish in milliseconds", () => {
  const n = 2048;
  const fill = (unit: string, prefix = "", suffix = "") =>
    prefix + unit.repeat(Math.floor((n - prefix.length - suffix.length) / unit.length)) + suffix;
  const inputs = [
    fill(" ", "a", "b"), fill("<"), fill('"'), fill('"', "", "<"), fill("a", "", "@"), fill("@"), fill("a-", "x@"),
    fill("a.", "x@"), fill(`${"a".repeat(62)}.`, "x@"), fill("@", "https://"), fill("a", "https://", "@"), fill(",", "mailto:"),
    fill("\u3002", "x@"), fill("ä", "x@"), fill("ä.", "x@"), fill("\uff20"), fill("-"), fill("a", "", ":"),
    fill("1", "x@zcu.cz:"), fill(" ", '"', '" <x@zcu.cz>'), fill("a", "<", ">"), fill("<a", "", ">"), fill('"a" ', "", "<x@zcu.cz>"),
    fill("\u200b"), fill("\u{1f98a}"), fill("%2e", "https://"), fill("a@", "", "zcu.cz"), fill("/@", "zcu.cz"),
    fill("x", "", ".cz"), fill("a.b-", "", "cz"),
  ];
  let worst = 0;
  let worstInput = "";
  for (const input of inputs) {
    for (let i = 0; i < 3; i++) {
      const t0 = performance.now();
      extractDomain(input);
      matchSchoolDomain(input);
      const dt = performance.now() - t0;
      if (dt > worst) [worst, worstInput] = [dt, input];
    }
  }
  assert.ok(worst < 50, `slowest input took ${worst.toFixed(1)} ms: ${show(worstInput)}`);
});

// ---------- values that are not plain strings ----------

test("values that are not strings return null and are never coerced", () => {
  let touched = false;
  const trap = new Proxy({}, { get: () => { touched = true; return () => "x@zcu.cz"; } });
  const values: unknown[] = [
    null, undefined, 0, 42, NaN, -0, 10n, true, false, Symbol("x@zcu.cz"), () => "x@zcu.cz", {}, [], ["x@zcu.cz"],
    { toString: () => "x@zcu.cz" }, { [Symbol.toPrimitive]: () => "x@zcu.cz" }, new String("x@zcu.cz"),
    new URL("https://zcu.cz/"), new Date(0), /x@zcu\.cz/, new Map([["x@zcu.cz", 1]]), trap, Object.create(null),
  ];
  for (const v of values) {
    assert.equal(extractDomain(v as string), null, String(typeof v));
    assert.equal(matchSchoolDomain(v as string), null);
    assert.equal(isSchoolDomain(v as string), false);
  }
  assert.equal(touched, false, "an object's methods were called");
});

test("exported functions work when detached from their module (callbacks, destructuring)", () => {
  assert.deepEqual(["x@zcu.cz", "x@seznam.cz"].map(isSchoolDomain), [true, false]);
  assert.deepEqual(["x@zcu.cz", "x@seznam.cz"].filter(matchSchoolDomain), ["x@zcu.cz"]);
  const { isSchool, match } = createChecker(["zcu.cz"]);
  assert.equal(isSchool("x@zcu.cz"), true);
  assert.equal(match.call(undefined, "x@zcu.cz"), "zcu.cz");
});

// ---------- createChecker ----------

test("createChecker accepts any iterable and normalizes entries", () => {
  const fromSet = createChecker(new Set(["zcu.cz"]));
  const fromGenerator = createChecker((function* () { yield "ZCU.cz."; yield " zcu.cz "; })());
  const fromMapKeys = createChecker(new Map([["zcu.cz", 1]]).keys());
  for (const c of [fromSet, fromGenerator, fromMapKeys]) {
    assert.equal(c.match("a@student.zcu.cz"), "zcu.cz");
    assert.equal(c.size, 1);
  }
  const unicode = createChecker(["škola.cz"]);
  assert.equal(unicode.match("x@škola.cz"), "xn--kola-f6a.cz");
  assert.equal(unicode.match("x@xn--kola-f6a.cz"), "xn--kola-f6a.cz");
  const empty = createChecker([]);
  assert.equal(empty.size, 0);
  assert.equal(empty.isSchool("x@zcu.cz"), false);
});

test("createChecker returns the most specific listed domain", () => {
  const c = createChecker(["zcu.cz", "student.zcu.cz"]);
  assert.equal(c.match("a@x.student.zcu.cz"), "student.zcu.cz");
  assert.equal(c.match("a@zcu.cz"), "zcu.cz");
  assert.equal(c.match("a@other.zcu.cz"), "zcu.cz");
});

test("createChecker refuses invalid lists and entries", () => {
  for (const list of [null, undefined, 42, {}, "zcu.cz", new String("zcu.cz"), true]) {
    assert.throws(() => createChecker(list as unknown as string[]), TypeError, String(list));
  }
  const badEntries = [
    "", " ", ".", "cz", ".cz", ".zcu.cz", "*.zcu.cz", "zcu..cz", "zcu.cz:443", "x@zcu.cz", "https://zcu.cz", "127.0.0.1",
    "[::1]", "localhost", "zcu.cz/", "zc u.cz", "zc\u200bu.cz", "zcu.cz\u202e", "-zcu.cz", "zcu_cz.cz", "a".repeat(64) + ".cz",
    42, null, undefined, {}, ["zcu.cz"],
  ];
  for (const entry of badEntries) {
    assert.throws(() => createChecker([entry as string]), TypeError, JSON.stringify(entry));
  }
  // a hole in an array is an undefined entry
  assert.throws(() => createChecker([, "zcu.cz"] as unknown as string[]), TypeError);
});

test("createChecker matching never falls back to a bare top-level domain or a prototype key", () => {
  const c = createChecker(["zcu.cz"]);
  for (const input of ["x@cz", "x@zcu", "x@__proto__.cz", "x@constructor", "x@tostring.cz", "x@hasownproperty", "x@valueof.cz"]) {
    assert.equal(c.match(input), null, input);
  }
});

// ---------- the data shipped with the package ----------

test("schoolDomains is frozen, sorted, unique, normalized and equal to data/domains.json", () => {
  assert.ok(Object.isFrozen(schoolDomains));
  assert.throws(() => { (schoolDomains as string[])[0] = "evil.example"; }, TypeError);
  assert.throws(() => (schoolDomains as string[]).push("evil.example"), TypeError);
  assert.deepEqual([...schoolDomains], readJson("data/domains.json"));
  assert.deepEqual([...schoolDomains], [...new Set(schoolDomains)].sort());
  assert.equal(createChecker(schoolDomains).size, schoolDomains.length);
  for (const d of schoolDomains) assert.equal(extractDomain(d), d);
});

test("no listed domain is blocklisted, free-mail or a public e-mail provider", () => {
  const blocked: string[] = readJson("data/blocklist.json");
  const all = new Set<string>(readJson("data/domains-all.json"));
  for (const d of schoolDomains) assert.ok(all.has(d), `${d} missing from domains-all.json`);
  const freemail = [
    "seznam.cz", "email.cz", "post.cz", "centrum.cz", "atlas.cz", "volny.cz", "tiscali.cz", "quick.cz", "azet.sk", "zoznam.sk",
    "centrum.sk", "post.sk", "pobox.sk", "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com", "yahoo.com",
    "icloud.com", "proton.me", "protonmail.com", "gmx.com", "onmicrosoft.com", "edu.cz", "edu.sk",
  ];
  for (const d of freemail) {
    assert.equal(matchSchoolDomain(`x@${d}`), null, d);
    assert.equal(matchSchoolDomain(`x@tenant.${d}`), null, `tenant.${d}`);
  }
  // a blocklisted host may only match through a listed parent (e.g. "ww.school.sk" under "school.sk": same owner);
  // a blocklisted shared root (edu.sk, edupage.org, a municipality) may still have verified school subdomains listed
  for (const d of blocked) {
    assert.ok(!LIST.has(d), `${d} is blocklisted and listed`);
    const m = matchSchoolDomain(`x@${d}`);
    assert.ok(m === null || (m !== d && d.endsWith("." + m)), `${d} matches ${m}`);
    assert.equal(matchSchoolDomain(`x@not-a-listed-school-${d.length}.${d}`) === null, !schoolDomains.some((s) => d.endsWith("." + s)), d);
  }
});

// ---------- README ----------

for (const file of ["README.md", "README.cs.md"]) test(`the examples printed in ${file} are true`, () => {
  const readme = readFileSync(path.join(ROOT, file), "utf8");
  const line = /^(isSchoolDomain|matchSchoolDomain|extractDomain)\(("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\);\s*\/\/\s*(true|false|null|"[^"]*")/gm;
  const fns = { isSchoolDomain, matchSchoolDomain, extractDomain } as Record<string, (s: string) => unknown>;
  let count = 0;
  for (const [, fn, arg, want] of readme.matchAll(line)) {
    const input = arg!.startsWith("'") ? arg!.slice(1, -1).replace(/\\(.)/g, "$1") : JSON.parse(arg!);
    assert.deepEqual(fns[fn!]!(input), JSON.parse(want!), `${fn}(${arg})`);
    count++;
  }
  assert.ok(count >= 15, `only ${count} examples found in ${file}`);
});
