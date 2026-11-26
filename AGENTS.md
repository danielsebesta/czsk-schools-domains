# AGENTS.md

How to change, check and release this repository, for AI agents and contributors. People who only use the data read [README.md](README.md).

## Rules

- No personal data (names, private e-mail addresses, phone numbers) anywhere: data, issues, pull requests, commits.
- Edit only `data/custom-domains.json` and `data/blocklist.json`. The lists and `packages/ts/src/domains*` are generated.
- `data/domains-detailed.json` is curated and cannot be regenerated. Change a record directly only in a reviewed pull request.
- An ambiguous input returns `null`, never a match.
- Write invisible and confusable characters as escapes (`"\u200b"`).
- `packages/ts` has no runtime dependencies and no install scripts.

| Path | Contents |
|---|---|
| `data/` | the lists, `custom-domains.json`, `blocklist.json` |
| `packages/ts/` | the npm package and all tests |
| `examples/` | checkers in Python, PHP, Go and shell |
| `scripts/` | build, validation, chart |
| `.github/` | workflows, issue forms, Dependabot |

## Add a school

1. Check the evidence: the domain belongs to the school, not to an e-mail or web provider.
2. Add it to `data/custom-domains.json`, sorted by domain. `domain`, `name` and `kind` are required, other fields follow the [record format](#record-format):
   ```json
   { "domain": "example-gymnazium.sk", "name": "Gymnázium Example", "country": "SK", "kind": "gymnazium" }
   ```
3. [Rebuild and validate](#rebuild-and-validate), then open a pull request with the evidence link and `Closes #N`.

A new domain enters the discount list (unless `"in_discount": false`) with `verified: false` and `confidence: 50` until a maintainer confirms it. For a domain that is already listed, only the fields you set change.

## Remove a domain

Add it to `data/blocklist.json` in alphabetical order; the blocklist always wins. Then rebuild and validate.

## Rebuild and validate

```bash
node scripts/build-lists.mjs                     # regenerate the lists
npm --prefix packages/ts ci --ignore-scripts
node scripts/validate-pr.mjs --base origin/main  # the same checks as CI
node scripts/render-chart.mjs                    # if the counts changed
```

`render-chart.mjs` redraws the chart and prints the numbers to copy into `README.md` and `README.cs.md`.

## Change how input is parsed

1. Change `packages/ts/src/index.ts` and all four `examples/` the same way.
2. Add the new inputs to `packages/ts/test/cases.ts`.
3. Run `npm test` in `packages/ts` with `REQUIRE_EXAMPLE_RUNTIMES=1`. It needs Node.js 22.18+, Python 3, PHP 8 with `ext-intl`, Go and bash.

## Release

Maintainers only: bump the version in `packages/ts/package.json`, push a `vX.Y.Z` tag on `main` and approve the `npm` environment. Switch to npm Trusted Publishing before January 2027 (see [`release.yml`](.github/workflows/release.yml)).

## Record format

```json
{
  "domain": "zcu.cz",
  "name": "Západočeská univerzita v Plzni",
  "address": "Univerzitní 2732/8",
  "city": "Plzeň",
  "zip": "30100",
  "ico": "49777513",
  "id": null,
  "country": "CZ",
  "kind": "vs",
  "level": "he",
  "confidence": 100,
  "verified": true,
  "in_discount": true,
  "mx": true,
  "sources": ["hipo-university-domains", "jetbrains-swot", "school-email-own-domain", "school-website", "wikidata-website"]
}
```

| Field | Format |
|---|---|
| `name` | official name from the school register, otherwise from ARES / RPO |
| `address` | `Street 123/4`, `Street 4`, or `Part of town 46` without a street |
| `city` | municipality as the register writes it; Bratislava and Košice without the district |
| `zip` | 5 digits, no space |
| `ico` | 8 digits, or `null` (e.g. Slovak kindergartens run directly by a municipality) |
| `id` | CZ `RED_IZO` or SK `EDUID` |
| `kind` | type of school, see below |
| `level` | `primary`, `secondary`, `he`, `preschool` or `other` |
| `confidence` | 0–100, how sure the type is |
| `verified` | confirmed against a register, the school's website or its e-mail contact |
| `in_discount` | in the discount list |
| `mx` | had a working MX record at the DNS check on 2026-11-25 |
| `sources` | where the domain was found and confirmed |

- Names: legal forms are written one way (`, s.r.o.`, `, příspěvková organizace`, …) and spaced dashes as ` - `. A school named after its living founder or director gets a neutral name (type and town).
- Addresses: the school register first, then the registered seat in ARES / RPO. Faculties share their university's IČO and address. 12 records have no address, and 3 schools run by a natural person show only `city`.

| `kind` | Type of school | Discount list |
|---|---|---|
| `zs` | primary school | yes |
| `gymnazium` | grammar school | yes |
| `sos` | secondary school (SŠ, SOŠ, SOU) | yes |
| `konzervator` | conservatory | yes |
| `vos` | higher vocational school | yes |
| `vs` | university | yes |
| `fakulta` | faculty | yes |
| `zus` | art school | yes |
| `ddm` | leisure-time centre (DDM, SVČ, CVČ) | yes |
| `special` | special school | yes |
| `jazykova` | language school | yes |
| `other_edu` | school facility (canteen, dormitory, counselling centre…) | unless `in_discount: false` |
| `ms` | kindergarten | no |
| `jesle` | nursery | no |
| `kurzy` | courses | no |
| `not_school` | not a school | no |

## Matching rules

| Export | Returns |
|---|---|
| `isSchoolDomain(input)` | `true` when the host or a parent domain is in the discount list |
| `matchSchoolDomain(input)` | the matched entry (`"zcu.cz"`) or `null` |
| `extractDomain(input)` | the normalized host (`"www.zcu.cz"`) or `null` |
| `createChecker(list)` | `{ isSchool, match, size }` for another list, e.g. `domains-all.json` |
| `schoolDomains` | the discount list, frozen and sorted |

The tests run every line of this block:

```ts
// Schools: case, display names, fullwidth characters and subdomains don't matter
isSchoolDomain("student@zcu.cz");                    // true
extractDomain("Student <student@ZCU.cz>");           // "zcu.cz"
matchSchoolDomain("https://www.zcu.cz/studium");     // "zcu.cz"
matchSchoolDomain("student@gapps.zcu.cz");           // "zcu.cz"
matchSchoolDomain("student@fiit.stuba.sk");          // "fiit.stuba.sk"
matchSchoolDomain("zak@student.gjp.cz");             // "student.gjp.cz"
isSchoolDomain("\uff53tudent@\uff5acu.cz");          // true

// Not schools
isSchoolDomain("someone@seznam.cz");                 // false (free-mail)
isSchoolDomain("info@hradekususice.cz");             // false (municipality; only skola.* is listed)
isSchoolDomain("info@18mskladno.cz");                // false (kindergarten, only in domains-all.json)
isSchoolDomain("x@neoverena-skola.edu.cz");          // false (unverified edu.cz subdomain)
isSchoolDomain("x@škola.cz");                        // false (no listed domain has diacritics)
matchSchoolDomain("https://evil.example/?a=x@zcu.cz"); // null (the host is evil.example)

// Refused as ambiguous
matchSchoolDomain("zcu.cz/@evil.example");           // null (the mail would go to evil.example)
matchSchoolDomain("a@evil.example, b@zcu.cz");       // null (several recipients)
matchSchoolDomain("a@evil.example@zcu.cz");          // null (more than one @)
matchSchoolDomain("@relay.example:x@zcu.cz");        // null (source route)
matchSchoolDomain("x@zcu\u200b.cz");                 // null (invisible character)
matchSchoolDomain("x@192.168.0.1");                  // null (IP address)

// Schools, but only the domain is checked
isSchoolDomain("student'--@zcu.cz");                 // true (escape the input before SQL, HTML or a shell)
isSchoolDomain("javascript://zcu.cz/%0aalert(1)");   // true (a match is not a safe link)
```

For services that use it:

- Teachers, graduates and at some schools parents have school addresses too, and subdomains match (a university kindergarten under the university domain). Always confirm the mailbox with a one-time code.
- Most primary-school pupils are below the GDPR age of digital consent (15 in CZ, 16 in SK). If you rely on consent, leave them out by `level` in `domains-detailed.json`.

| Example | Unicode domains | Batch mode |
|---|---|---|
| [`examples/python`](examples/python/check.py) | yes | `--json` |
| [`examples/php`](examples/php/check.php) | with `ext-intl` | `--json` |
| [`examples/go`](examples/go) | ASCII only | `-json` |
| [`examples/shell`](examples/shell/check.sh) | no, exact match only | |

Batch mode reads a JSON array of inputs on stdin and prints `[host, match]` pairs; the tests use it to compare the examples with the package.

## Tests

| Suite | Checks |
|---|---|
| Corpus | 300+ typed and malicious inputs in 11 groups |
| Fuzzing | 30,000 generated inputs against the WHATWG URL parser |
| Mixing | a school domain mixed with an attacker's one matches only if the mail goes to the school |
| ReDoS | 2 KB adversarial inputs finish in milliseconds |
| Cross-language | the four examples give the package's answers |
| API | non-string values, `createChecker` edge cases |
| Data | the lists are sorted, normalized and free of blocked and free-mail domains |
| Docs | the example lines in `README.md`, `README.cs.md` and this file |

## Checks

| Workflow | When | Does |
|---|---|---|
| [PR check](.github/workflows/pr-check.yml) | pull requests, pushes to `main` | validates the data with the base branch's scripts, builds and tests the package |
| [DNS audit](.github/workflows/dns-audit.yml) | monthly | opens an issue with domains that have no DNS or MX |
| [Release](.github/workflows/release.yml) | `vX.Y.Z` tags | publishes to npm and attaches the lists to the GitHub Release |

The PR check fails on:

| Check | Fails when |
|---|---|
| Format | a domain is not a lowercase hostname, or has a scheme, path or `www.`, is an IP, a duplicate or out of order |
| Providers | a domain is blocklisted, a public suffix, a shared-hosting root (`edupage.org`, `webnode.cz`…) or a free-mail or alias provider (`gmail.com`, `seznam.cz`…) |
| Schema | a record in `domains-detailed.json` misses a field, changes the key order or has a wrong format |
| DNS | a new domain has no MX, A or AAAA record, or is parked |
| Sensitive | without the `maintainer-approved` label: removing blocklist entries, changing a `kind`, moving a record into the discount list, adding 200+ domains |
| Package | runtime dependencies, install scripts, a failed build or test |
| Examples | an example answers differently than the package |

## Sources

| Source | Used for | Licence |
|---|---|---|
| CZ school register (RSSZ) | schools, names, addresses, `RED_IZO` | public register |
| SK school register (RIS, eduZoznam) | schools, names, addresses, `EDUID` | public register |
| ARES (CZ), RPO (SK) | legal names and seats by IČO | public registers |
| MŠMT registers of universities | Czech universities | public register |
| school websites and contact pages | domains and their confirmation | |
| [Wikidata](https://www.wikidata.org/) | school websites | CC0 |
| [JetBrains/swot](https://github.com/JetBrains/swot) | academic domains | MIT |
| [Hipo/university-domains-list](https://github.com/Hipo/university-domains-list) | university domains | MIT |

Add every new source to [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) as well.

## Maintainers

- `main` is protected: pull request, a code owner's review, passing `data` and `test` checks.
- Labels: `maintainer-approved`, `new-school`, `correction`, `dns-audit`.
- Answer correction and removal requests within one month.
- Refresh the Public Suffix List now and then:
  ```bash
  curl -fsSL https://publicsuffix.org/list/public_suffix_list.dat -o scripts/public_suffix_list.dat
  ```
