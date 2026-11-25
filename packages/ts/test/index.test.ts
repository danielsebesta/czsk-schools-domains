import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isSchoolDomain, matchSchoolDomain, extractDomain, createChecker, schoolDomains } from "../dist/esm/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const allDomains: string[] = JSON.parse(
  readFileSync(path.resolve(__dirname, "../../../data/domains-all.json"), "utf8"),
);

test("matches e-mails, URLs, uppercase and trailing dots", () => {
  assert.equal(isSchoolDomain("student@1-zsbenatky.cz"), true);
  assert.equal(isSchoolDomain("https://www.1-zsbenatky.cz/kontakt"), true);
  assert.equal(isSchoolDomain("www.1-zsbenatky.cz/kontakt"), true);
  assert.equal(isSchoolDomain("1-ZSBENATKY.cz."), true);
  assert.equal(extractDomain("  Student@ZCU.CZ. "), "zcu.cz");
});

test("matches valid CZ/SK student and school subdomains", () => {
  assert.equal(matchSchoolDomain("a@student.zcu.cz"), "zcu.cz");
  assert.equal(matchSchoolDomain("a@gapps.zcu.cz"), "zcu.cz");
  assert.equal(matchSchoolDomain("123456@mail.muni.cz"), "muni.cz");
  assert.equal(matchSchoolDomain("student@fiit.stuba.sk"), "fiit.stuba.sk");
  assert.equal(matchSchoolDomain("student@st.uniba.sk"), "uniba.sk");
  assert.equal(matchSchoolDomain("zak@student.gjp.cz"), "student.gjp.cz");
  assert.equal(matchSchoolDomain("info@skola.hradekususice.cz"), "skola.hradekususice.cz");
});

test("rejects freemails, municipal portals, pure kindergartens and unverified edu.* subdomains", () => {
  assert.equal(isSchoolDomain("someone@seznam.cz"), false);
  assert.equal(isSchoolDomain("someone@gmail.com"), false);
  assert.equal(isSchoolDomain("info@hradekususice.cz"), false);
  assert.equal(isSchoolDomain("info@18mskladno.cz"), false);
  assert.equal(isSchoolDomain("x@edu.cz"), false);
  assert.equal(isSchoolDomain("x@neoverena-skola.edu.cz"), false);
  assert.equal(isSchoolDomain("x@edu.sk"), false);
  assert.equal(isSchoolDomain("x@neoverena-skola.edu.sk"), false);
  assert.equal(isSchoolDomain("x@st.uba.sk"), false);
  assert.equal(isSchoolDomain("info@primirest.cz"), false);
  assert.equal(isSchoolDomain("info@zus.horazdovice.cz"), false);
  assert.equal(extractDomain("nonsense"), null);
});

test("schoolDomains is read-only", () => {
  assert.throws(() => (schoolDomains as string[]).push("evil.example"));
});

test("an @ in a URL path, query or fragment does not select the host", () => {
  assert.equal(matchSchoolDomain("https://evil.example/?ref=x@zcu.cz"), null);
  assert.equal(matchSchoolDomain("https://evil.example#a@zcu.cz"), null);
  assert.equal(extractDomain("https://user:pw@www.zcu.cz:8443/x?y=z@evil.example"), "www.zcu.cz");
  assert.equal(extractDomain("https://zcu.cz@evil.example/"), "evil.example");
  assert.equal(matchSchoolDomain("https://www.zcu.cz?x=1"), "zcu.cz");
  assert.equal(matchSchoolDomain("mailto:student@zcu.cz"), "zcu.cz");
  assert.equal(matchSchoolDomain("Student Name <student@zcu.cz>"), "zcu.cz");
  assert.equal(matchSchoolDomain('"Name, Student" <student@zcu.cz>'), "zcu.cz");
});

test("refuses inputs where the mail would go to another host (bypass attempts)", () => {
  const bypasses = [
    // "/", "?" or "#" before the "@": an address at evil.example, but a URL to zcu.cz
    "zcu.cz/@evil.example",
    "zcu.cz?@evil.example",
    "zcu.cz#@evil.example",
    "student.zcu.cz/@evil.example",
    "evil.example/path@zcu.cz",
    '"x@zcu.cz/"@evil.example',
    '"a@zcu.cz"@evil.example',
    // several recipients, comments, several angle addresses
    "a@evil.example, <b@zcu.cz>",
    "a@evil.example,b@zcu.cz",
    "a@evil.example;b@zcu.cz",
    "<a@evil.example> <b@zcu.cz>",
    "a@zcu.cz <b@evil.example>",
    '"zcu.cz" <a@evil.example>',
    "a@evil.example(@zcu.cz/)",
    "a@evil.example,x.zcu.cz",
    // backslashes: WHATWG URL treats "\" like "/"
    "https://evil.example\\@zcu.cz",
    "https:evil.example\\@zcu.cz",
    "ws://evil.example\\@zcu.cz",
    "HTTPS://EVIL.EXAMPLE\\@ZCU.CZ",
    "x@zcu.cz\\ä.evil.example",
    // mailto: with extra recipients or headers
    "mailto:b@zcu.cz?cc=a@evil.example",
    "mailto:b@zcu.cz?bcc=a@evil.example",
    "mailto:a@evil.example,b@zcu.cz",
    // control characters, IP literals, ports in e-mails, fullwidth delimiters
    "a@evil.example\u0000.zcu.cz",
    "a@evil.example\nzcu.cz",
    "x@zcu.cz:evil.example",
    "x@[147.228.1.1]",
    "x@147.228.1.1",
    "x@zcu.cz\uff0fevil",
    "x@zcu\uff0ecz\uff20evil.example",
  ];
  for (const input of bypasses) {
    assert.equal(matchSchoolDomain(input), null, JSON.stringify(input));
  }
});

test("Unicode dots and fullwidth letters normalize to the real host", () => {
  assert.equal(extractDomain("x@zcu\u3002cz"), "zcu.cz");
  assert.equal(extractDomain("x@zcu\uff0ecz"), "zcu.cz");
  assert.equal(extractDomain("x@\uff5a\uff43\uff55.cz"), "zcu.cz");
  assert.equal(extractDomain("x@škola.cz"), "xn--kola-f6a.cz");
});

test("non-string and oversized inputs return null instead of throwing", () => {
  for (const v of [null, undefined, 42, {}, ["x@zcu.cz"], { toString: () => "x@zcu.cz" }]) {
    assert.equal(isSchoolDomain(v as unknown as string), false);
    assert.equal(extractDomain(v as unknown as string), null);
  }
  assert.equal(extractDomain(`x@${"a".repeat(5000)}.cz`), null);
});

test("rejects malformed hosts", () => {
  assert.equal(extractDomain("x@ .zcu.cz"), null);
  assert.equal(extractDomain("x@.zcu.cz"), null);
  assert.equal(extractDomain("x@-.zcu.cz"), null);
  assert.equal(extractDomain("x@zcu..cz"), null);
  assert.equal(extractDomain("x@"), null);
  assert.equal(extractDomain("https://127.0.0.1/"), null);
});

test("createChecker normalizes list entries and rejects invalid ones", () => {
  const c = createChecker([" Example.CZ. "]);
  assert.equal(c.match("a@example.cz"), "example.cz");
  assert.equal(c.size, 1);
  assert.throws(() => createChecker("zcu.cz" as unknown as string[]), TypeError);
  assert.throws(() => createChecker(["*.zcu.cz"]), TypeError);
  assert.throws(() => createChecker([".zcu.cz"]), TypeError);
  assert.throws(() => createChecker(["cz"]), TypeError);
  assert.throws(() => createChecker([42 as unknown as string]), TypeError);
  const proto = createChecker(["zcu.cz"]);
  assert.equal(proto.match("x@__proto__.cz"), null);
  assert.equal(proto.match("x@constructor"), null);
});

test("createChecker with domains-all.json includes kindergartens", () => {
  const allChecker = createChecker(allDomains);
  assert.equal(allChecker.isSchool("info@18mskladno.cz"), true);
  assert.equal(allChecker.isSchool("someone@gmail.com"), false);
});

test("compiled ESM and CommonJS bundles work identically", async () => {
  const esmPath = path.resolve(__dirname, "../dist/esm/index.js");
  const cjsPath = path.resolve(__dirname, "../dist/cjs/index.js");
  const esm = await import(new URL(`file:///${esmPath.replace(/\\/g, "/")}`).href);
  const require = createRequire(import.meta.url);
  const cjs = require(cjsPath);

  assert.equal(esm.matchSchoolDomain("a@student.zcu.cz"), "zcu.cz");
  assert.equal(cjs.matchSchoolDomain("a@student.zcu.cz"), "zcu.cz");
  assert.equal(esm.isSchoolDomain("someone@seznam.cz"), false);
  assert.equal(cjs.isSchoolDomain("someone@seznam.cz"), false);
  assert.equal(esm.matchSchoolDomain("zcu.cz/@evil.example"), null);
  assert.equal(cjs.matchSchoolDomain("zcu.cz/@evil.example"), null);
});
