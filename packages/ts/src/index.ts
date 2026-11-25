import { DOMAINS } from "./domains-data.js";

const HOSTNAME = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
const MAX_INPUT = 2048;
// "Name <user@school.cz>" or "\"Name\" <user@school.cz>": exactly one address in angle brackets
const NAME_ADDR = /^(?:"[^"\\]*"|[^<>@,;:"()\\]*)\s*<([^<>]*)>$/;
const URL_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//;
// whitespace, control characters and backslashes change where a URL's host ends (WHATWG)
const URL_BAD = /[\x00-\x20\x7f\\]/;
// characters that make an e-mail input ambiguous: lists, comments, quoted local parts, IP literals, Unicode spaces
const MAIL_BAD = /[\x00-\x20\x7f,;<>()"\\[\]\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]/;
// invisible and bidirectional formatting characters (C1 controls, soft hyphen, zero-width characters,
// bidi embeddings and overrides, word joiners, variation selectors, BOM, tag characters): they hide what
// the user sees, and some of them silently disappear in IDNA processing
const INVISIBLE = /[\u0080-\u009f\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180b-\u180f\u200b-\u200f\u202a-\u202e\u2060-\u206f\u3164\ufe00-\ufe0f\ufeff\uffa0\ufff0-\ufffb\u{1d173}-\u{1d17a}\u{e0000}-\u{e0fff}]/u;

function normalizeHost(raw: string): string | null {
  let s = raw.toLowerCase();
  if (!s || INVISIBLE.test(s)) return null;
  // Unicode (IDN) host -> punycode, so it can be compared with the ASCII list
  if (/[^\x00-\x7f]/.test(s)) {
    if (/[\\/?#@:%[\]\s]/.test(s)) return null;
    try {
      const u = new URL(`http://${s}`);
      // fullwidth "/", "?", "#", "@" or ":" are mapped to ASCII by the URL parser: reject those
      if (u.username || u.password || u.port || u.pathname !== "/" || u.search || u.hash) return null;
      s = u.hostname;
    } catch {
      return null;
    }
  }
  s = s.replace(/\.$/, ""); // one trailing dot (the DNS root) is allowed: "zcu.cz." or "zcu.cz\u3002"
  if (!HOSTNAME.test(s)) return null;
  // an IP address is not a domain: the top-level label must contain a letter
  return /[a-z]/.test(s.slice(s.lastIndexOf(".") + 1)) ? s : null;
}

/**
 * Extract the lowercase host from an e-mail address, a URL or a bare domain.
 *
 * Returns null when the input has no valid host name or is ambiguous, e.g. several
 * recipients, comments, quoted local parts, a backslash, more than one "@", a ":" in an
 * e-mail address, an "@" together with "/", "?" or "#", or invisible / bidi formatting characters.
 * Only the domain is checked: the local part is not validated or escaped, so treat the input as
 * untrusted text (SQL, HTML, headers). A match only says where the address points: confirm the
 * mailbox with a one-time code.
 */
export function extractDomain(input: string): string | null {
  if (typeof input !== "string" || input.length > MAX_INPUT) return null;
  let s = input.trim().toLowerCase();
  if (!s) return null;
  const named = NAME_ADDR.exec(s);
  if (named) s = (named[1] ?? "").trim();
  if (!s || INVISIBLE.test(s)) return null;

  if (URL_SCHEME.test(s)) {
    // URL: the host ends at the first "/", "?" or "#"; the userinfo ends at the last "@" before it
    if (URL_BAD.test(s)) return null;
    const authority = s.replace(URL_SCHEME, "").split(/[/?#]/)[0] ?? "";
    const host = authority.slice(authority.lastIndexOf("@") + 1).replace(/:\d*$/, "");
    return normalizeHost(host);
  }

  if (s.startsWith("mailto:")) {
    s = s.slice(7);
    // several recipients or extra headers (?cc=, ?bcc=) or percent-encoding: refuse to guess
    if (/[?#&%,]/.test(s)) return null;
  }
  if (MAIL_BAD.test(s)) return null;

  const at = s.indexOf("@");
  if (at !== -1) {
    // "school.cz/@evil.example" is an address at evil.example, but a URL to school.cz: refuse to guess.
    // Several "@" ("a@evil.example@school.cz") are read differently by different mail libraries, and a ":"
    // is a source route ("@relay:user@school.cz") or group syntax ("group:user@school.cz;").
    if (/[/?#:]/.test(s) || s.indexOf("@", at + 1) !== -1) return null;
    return normalizeHost(s.slice(at + 1));
  }
  // bare domain, optionally with a port and a path ("www.school.cz/kontakt")
  return normalizeHost((s.split(/[/?#]/)[0] ?? "").replace(/:\d*$/, ""));
}

/** Build a checker over a custom domain list (e.g. the "all" list). Throws on invalid entries. */
export function createChecker(list: Iterable<string>) {
  if (typeof list === "string" || list == null || typeof (list as Iterable<string>)[Symbol.iterator] !== "function") {
    throw new TypeError("createChecker expects an iterable of domain names");
  }
  const set = new Set<string>();
  for (const entry of list) {
    const d = typeof entry === "string" ? normalizeHost(entry.trim()) : null;
    if (!d) {
      throw new TypeError(`createChecker: invalid domain ${typeof entry === "string" ? JSON.stringify(entry) : typeof entry}`);
    }
    set.add(d);
  }
  /** Returns the matched list entry (domain or parent domain), or null. */
  function match(input: string): string | null {
    const host = extractDomain(input);
    if (!host) return null;
    const parts = host.split(".");
    // student.zs-example.cz -> zs-example.cz (stop before the bare TLD)
    for (let i = 0; i < parts.length - 1; i++) {
      const candidate = parts.slice(i).join(".");
      if (set.has(candidate)) return candidate;
    }
    return null;
  }
  return { match, isSchool: (input: string) => match(input) !== null, size: set.size };
}

const defaultChecker = createChecker(DOMAINS);

export const isSchoolDomain = defaultChecker.isSchool;
export const matchSchoolDomain = defaultChecker.match;
export const schoolDomains: readonly string[] = Object.freeze([...DOMAINS]);
