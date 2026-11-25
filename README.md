# czsk-schools-domains

Verified domains of Czech and Slovak schools, plus a zero-dependency TypeScript/JavaScript package (`czsk-schools-domains`) and ready-to-copy examples for checking whether an e-mail address, URL, or domain belongs to a school. The data is institution metadata from public registers: no e-mail addresses, phone numbers or contact persons. Where the official name of a private school contains the name of its living founder or director, a neutral name (type of school and town) is used instead.

## Security: a match is not proof of student status

- A match only says that the address points to a school's domain. Teachers, other staff, parents' accounts at some schools and sometimes graduates (e.g. `alumni.cvut.cz`) have addresses there too.
- Subdomains of a listed domain match as well, e.g. a university kindergarten under the university domain.
- **Always confirm the mailbox:** send a one-time code to the exact address and require it back. Where possible, also ask for an ISIC card or a confirmation of study.
- Validate the address format first. The package refuses ambiguous input: several recipients, comments, quoted local parts, backslashes, more than one `@`, a `:` in an address (a source route such as `@relay.example:student@school.cz`), an `@` together with `/`, `?` or `#` (`school.cz/@evil.example` is an address at `evil.example`), and invisible or bidirectional formatting characters (zero-width space, right-to-left override).
- Only the domain is checked. The part before the `@` is passed through as typed (`student'--@zcu.cz` matches), so escape or parameterize the input before it goes into SQL, HTML, e-mail headers or a shell command. A matching URL is not a safe link either (`javascript://zcu.cz/...` matches `zcu.cz`).
- Most primary-school pupils are below the GDPR age of digital consent (15 in the Czech Republic, 16 in Slovakia). If you rely on consent, ask for the parents' consent, or use `level` in `domains-detailed.json` to leave primary schools out.
- Domains change owners. The list is re-checked, but a domain that expired yesterday can still be in it: keep the one-time-code step.

## Data (`data/`)

| File | Content |
|---|---|
| `domains.json` / `domains.txt` | 7331 domains of universities and faculties, higher vocational schools (VOŠ), secondary schools, primary schools, special schools, art schools (ZUŠ), language schools and leisure-time centres (DDM / SVČ / CVČ). Kindergartens, nurseries, school support facilities (canteens, dormitories, counselling centres, children's homes, youth-care institutes) and staff-only university units (rectorates, research centres) are excluded. |
| `domains-all.json` | All 9585 domains, including kindergartens and school support facilities. |
| `domains-detailed.json` | Same as `domains-all.json`, with `name`, `address`, `city`, `zip`, `ico` (8-digit CZ/SK IČO), `id` (CZ `RED_IZO` / SK `EDUID`), `country` (`CZ` \| `SK`), `kind`, `level`, `confidence`, `verified`, `in_discount`, `mx`, and `sources`. |
| `custom-domains.json` | High-priority community additions applied by `scripts/build-lists.mjs`. |
| `blocklist.json` | High-priority freemail, ISP, shared-hosting, municipal and taken-over domains that must never be listed. |

`domains-detailed.json` field formats:

- `name`: the official name from the school registry (CZ RSSZ / SK RIS) where the school is registered, otherwise the legal name from ARES / RPO. Legal forms are written one way: `, s.r.o.`, `, spol. s r.o.`, `, o.p.s.`, `, z.ú.`, `, a.s.`, `, n.o.` and `, příspěvková organizace`. Spaced dashes are always ` - `.
- `address`: `Street 123/4` (land-registry number / house number). When there is only one number it is written as `Street 4`. When there is no street, the part of the municipality is used instead (`Hrhov 46`).
- `city`: the municipality as the registry writes it (`Praha`, `Brno`, `Frýdek-Místek`). Districts of Bratislava and Košice are written as `Bratislava` / `Košice`.
- `zip`: 5 digits without a space (`11000`).
- Sources: CZ school registry by `RED_IZO`, then the ARES registered seat by IČO. SK school registry by `EDUID` / IČO, then the RPO seat.
- Faculties and other parts of a university share the university's IČO and its seat address.
- `address` / `city` / `zip` are `null` for the 12 entries without a confirmed registry record. For 3 schools run by a natural person only `city` is given.
- `ico` is `null` for Slovak schools that have no IČO of their own in the registry (e.g. kindergartens run directly by a municipality or by a natural person) and for a few institutions without a confirmed IČO.
- `mx`: `true` when the domain had an MX record with a resolvable mail server at the DNS check on 2026-11-25, so it can receive e-mail. `false` means no MX record, a null MX (`0 .`) or an MX pointing to a mail server that does not exist: the domain is a school website without its own mail. It is kept so that URLs can be matched, but an e-mail address at it is unlikely. Where the official registry gives the school a different e-mail domain, that domain is in the list as well.
- `verified`: `true` when the maintainers confirmed the domain against a register or the school's own web site or e-mail contact. A new community entry starts as `false` with `confidence` 50 until a maintainer checks it. `confidence` (0–100) says how sure the classification of the school is.

`domains-detailed.json` is curated: it was built from the registers with private tooling and manual review, and it cannot be regenerated from this repository alone. Changes go through `custom-domains.json` / `blocklist.json` (or a reviewed PR that edits the record).

Non-JS/TS users can also download `domains.json`, `domains.txt`, `domains-all.json`, and `domains-detailed.json` directly from **GitHub Releases** on every `v*` tag.

## Installation & Usage

### TypeScript / JavaScript (`czsk-schools-domains`)

Zero external dependencies (`dependencies: {}`), ships both **ESM** and **CommonJS** bundles with generated `.d.ts` type definitions.

```bash
npm install czsk-schools-domains   # published to npm from the first v* release
```

```ts
import { readFileSync } from "node:fs";
import { isSchoolDomain, matchSchoolDomain, extractDomain, createChecker } from "czsk-schools-domains";

// Matching is case-insensitive and covers subdomains of listed school domains
isSchoolDomain("student@student.zcu.cz");       // true  (matches zcu.cz)
isSchoolDomain("student@gapps.zcu.cz");         // true  (matches zcu.cz)
isSchoolDomain("123456@mail.muni.cz");          // true  (matches muni.cz)
isSchoolDomain("student@fiit.stuba.sk");        // true  (matches fiit.stuba.sk)
isSchoolDomain("student@st.uniba.sk");          // true  (matches uniba.sk)
isSchoolDomain("zak@student.gjp.cz");           // true  (matches student.gjp.cz)
isSchoolDomain("info@skola.hradekususice.cz");  // true  (matches skola.hradekususice.cz)

// Rejected cases
isSchoolDomain("someone@seznam.cz");            // false (freemail)
isSchoolDomain("someone@gmail.com");            // false (freemail)
isSchoolDomain("info@hradekususice.cz");        // false (municipal portal; only skola.* is listed)
isSchoolDomain("info@18mskladno.cz");           // false (pure kindergarten; present only in domains-all.json)
isSchoolDomain("x@neoverena-skola.edu.cz");     // false (unverified edu.cz subdomain)
isSchoolDomain("x@neoverena-skola.edu.sk");     // false (unverified edu.sk subdomain)

matchSchoolDomain("https://www.zcu.cz/studium"); // "zcu.cz"
matchSchoolDomain("https://evil.example/?a=x@zcu.cz"); // null (an "@" in a path or query is not the host)
matchSchoolDomain("zcu.cz/@evil.example");      // null (the mail would go to evil.example)
matchSchoolDomain("a@evil.example, b@zcu.cz");  // null (several recipients)
extractDomain("Student <student@ZCU.cz>");      // "zcu.cz"

// Any other list, e.g. domains-all.json (with kindergartens) downloaded from the GitHub Release.
// createChecker throws a TypeError on entries that are not valid domain names.
const all = createChecker(JSON.parse(readFileSync("domains-all.json", "utf8")));
all.isSchool("info@18mskladno.cz");             // true
```

A subdomain that is out of the discount list still matches when its parent domain is in it (e.g. a university kindergarten under the university domain).

### Other languages

The examples apply the same input rules as the package (they refuse several recipients, comments, backslashes and an `@` together with `/`, `?` or `#`).

- **Python**: `examples/python/check.py`
- **Go**: `examples/go` (`go run . student@zcu.cz`; ASCII domains only)
- **PHP**: `examples/php/check.php` (Unicode domains need `ext-intl`)
- **Shell**: `examples/shell/check.sh` (plain addresses only, exact match)

The Python, PHP and Go examples also have a batch mode: `--json` (Go: `-json`) reads a JSON array of inputs on stdin and prints a JSON array of `[host, match]`.

## Automation & Maintenance

- **PR Validation (`.github/workflows/pr-check.yml`)**: the PR's data is validated with the scripts from the base branch, so a PR cannot weaken its own checks. It checks domain format and sorting, the record schema, the blocklist, public suffixes (vendored Public Suffix List), free-mail / alias / free-subdomain providers, and active DNS (`MX` / `A` / `AAAA`) for new domains. Removing blocklist entries, changing the `kind` of an existing record, moving it into the discount list, or adding more than 200 domains needs a maintainer's `maintainer-approved` label. A second job builds the package (ESM/CJS) and runs the unit tests and example smoke tests.
- **Monthly DNS / MX Audit (`.github/workflows/dns-audit.yml`)**: runs `scripts/check-mx.mjs` monthly across `data/domains-all.json` and opens/updates an issue listing any domains without active DNS/MX records.
- **Releases (`.github/workflows/release.yml`)**: pushing a `vX.Y.Z` tag on a commit on `main` builds and tests the package, publishes it to npm with provenance from the protected `npm` environment, and attaches the data files to the GitHub Release.
- **Tests (`packages/ts/test`)**: 300 inputs that people type or attackers try (typos, copy-paste spaces, Unicode and fullwidth characters, homoglyphs, IP addresses, invisible and bidi characters, SQL / HTML / header / shell injection, bypass attempts), 30 000 generated inputs checked against the WHATWG URL parser as a reference, time limits for 2 KB adversarial inputs (ReDoS), odd JavaScript values, `createChecker` edge cases, the data and the examples in this README. The same inputs run through the Python, PHP, Go and shell examples, which must give the same answers. Run `npm test` in `packages/ts`; a runtime that is not installed is skipped unless `REQUIRE_EXAMPLE_RUNTIMES=1` (as in CI).

See [CONTRIBUTING.md](CONTRIBUTING.md) for instructions on submitting missing schools or removals.

## Corrections, removal and privacy

- A school can ask for a correction or for its domain to be removed by opening an issue with the **Correction or removal** template. Please do not post personal data in issues. Requests are answered within one month.
- What is published: domains of schools and the institutions' own metadata from public registers (name, address of the seat, IČO, registry id, type of school), plus technical DNS facts. No e-mail addresses, phone numbers or names of contact persons.
- Purpose and legal basis: helping services recognise school e-mail domains (legitimate interest, Art. 6(1)(f) GDPR). Where a record relates to a natural person (a school run by a sole trader), only the town is given, and you can object, ask for a correction or for removal through the issue template.

## Sources and licence

Compiled from the official school registries (CZ: RSSZ directory; SK: RIS / eduZoznam), the business registers ARES (CZ) and RPO (SK; run by the Ministry of the Interior of the Slovak Republic since June 2026, previously by the Statistical Office), the CZ MŠMT register of universities and its list of foreign higher-education institutions, school websites and their contact pages, Wikidata (CC0), JetBrains/swot (MIT), and Hipo/university-domains-list (MIT). Every domain was checked against a register or the school's own web site or e-mail contact, and against DNS. Language models helped classify the type of school from home pages; disputed cases were settled against the registers or by hand.

- **Data** (`data/` and the list inside the npm package): [CC BY 4.0](LICENSE-DATA.md). Source attributions and third-party licence texts are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
- **Code** (scripts, examples, `packages/ts`): [MIT](LICENSE).
