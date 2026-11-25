// Minimal Public Suffix List matcher (ICANN and private sections) for CI checks.
// The list is vendored from https://publicsuffix.org/list/public_suffix_list.dat (MPL-2.0);
// refresh it with: curl -fsSL https://publicsuffix.org/list/public_suffix_list.dat -o scripts/public_suffix_list.dat
import fs from "node:fs";
import path from "node:path";
import { domainToASCII, fileURLToPath } from "node:url";

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "public_suffix_list.dat");

let rules = null;

function load() {
  const exact = new Set();
  const wildcard = new Set();
  const exception = new Set();
  for (const raw of fs.readFileSync(FILE, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("//")) continue;
    if (line.startsWith("!")) exception.add(domainToASCII(line.slice(1)));
    else if (line.startsWith("*.")) wildcard.add(domainToASCII(line.slice(2)));
    else exact.add(domainToASCII(line));
  }
  if (exact.size < 5000) throw new Error(`public_suffix_list.dat looks truncated (${exact.size} rules)`);
  return { exact, wildcard, exception };
}

/** True when the (lowercase ASCII) domain is itself a public suffix, e.g. "cz", "co.uk", "github.io", "eu.org". */
export function isPublicSuffix(domain) {
  rules ??= load();
  if (rules.exception.has(domain)) return false;
  if (rules.exact.has(domain)) return true;
  const dot = domain.indexOf(".");
  return dot !== -1 && rules.wildcard.has(domain.slice(dot + 1));
}
