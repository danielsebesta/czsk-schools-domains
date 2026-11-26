# Contributing

Most changes are a single entry in one of two files. You never edit the generated lists (`domains.json`, `domains.txt`, `domains-all.json`) by hand, and `domains-detailed.json` is the curated source of truth that changes only through these files or a reviewed PR.

| I want to… | Do this |
|---|---|
| suggest a missing school without editing files | fill in the [Add a school](https://github.com/danielsebesta/czsk-schools-domains/issues/new?template=add-school.yml) form |
| add a missing school | add it to [`data/custom-domains.json`](#add-a-missing-school) |
| remove a dead or wrong domain | add it to [`data/blocklist.json`](#remove-a-domain) |
| correct or remove my school's data | open a [Correction or removal](https://github.com/danielsebesta/czsk-schools-domains/issues/new?template=correction.yml) issue |
| change how input is parsed | change [all five implementations](#change-how-input-is-parsed) |

> [!WARNING]
> Never post personal data (names, private e-mail addresses, phone numbers) in issues or pull requests.

## Add a missing school

1. Add an object to `data/custom-domains.json`, sorted by domain. `domain`, `name` and `kind` are required:
   ```json
   [
     {
       "domain": "example-gymnazium.sk",
       "name": "Gymnázium Example",
       "country": "SK",
       "kind": "gymnazium"
     }
   ]
   ```
2. [Rebuild and validate](#rebuild-and-validate).
3. In the pull request, link the school's web page or registry record that shows the domain.

| Field | Notes |
|---|---|
| `domain`, `name`, `kind` | Required for a new domain. |
| `address`, `city`, `zip`, `ico`, `id`, `country`, `level`, `mx`, `confidence` | Optional, in the formats described in the [README](README.md#record-format). |
| `in_discount` | Optional. A new domain enters the discount list unless set to `false`; an existing record keeps its value. |

- A new entry starts with `verified: false` and `confidence: 50` until a maintainer checks it against a register.
- For a domain that is already in `domains-detailed.json`, only the fields you set override the record. A plain string (`"example.cz"`) only keeps the domain listed.

| `kind` | Type of school | Discount list |
|---|---|---|
| `zs` | primary school | yes |
| `gymnazium` | grammar school | yes |
| `sos` | secondary school (SŠ, SOŠ, SOU) | yes |
| `konzervator` | conservatory | yes |
| `vos` | higher vocational school (VOŠ) | yes |
| `vs` | university | yes |
| `fakulta` | faculty | yes |
| `zus` | art school (ZUŠ) | yes |
| `ddm` | leisure-time centre (DDM, SVČ, CVČ) | yes |
| `special` | special school | yes |
| `jazykova` | language school | yes |
| `other_edu` | school support facility (canteen, dormitory, counselling centre…) | yes, unless `in_discount: false` |
| `ms` | kindergarten | never |
| `jesle` | nursery | never |
| `kurzy` | courses | never |
| `not_school` | not a school | never |

## Remove a domain

Add the lowercase domain to `data/blocklist.json`, in alphabetical order. The blocklist always wins over `custom-domains.json` and the base lists. Then [rebuild and validate](#rebuild-and-validate).

## Rebuild and validate

```bash
node scripts/build-lists.mjs                     # regenerates the lists and packages/ts/src/domains*
npm --prefix packages/ts ci --ignore-scripts
node scripts/validate-pr.mjs --base origin/main  # the same checks as CI
```

## What the PR check verifies

Every pull request runs [`pr-check.yml`](.github/workflows/pr-check.yml). The data is validated with the scripts from the base branch, so changes to `scripts/`, the workflows or the tests in the same PR do not affect that check.

| Check | Fails when |
|---|---|
| Format | A domain is not a lowercase hostname, has a scheme, a path or `www.`, is an IP address, a duplicate, or out of order. |
| Blocklist and providers | A domain is on `blocklist.json`, is a public suffix (Public Suffix List, including private suffixes such as `github.io` or `eu.org`), a shared-hosting root (`edu.sk`, `edupage.org`, `webnode.cz`, …), or a free-mail, alias or free-subdomain provider or one of its subdomains (`gmail.com`, `seznam.cz`, `onmicrosoft.com`, `duckdns.org`, `edu.cz`, …). Hosts under `edu.sk` are allowed only as individual verified school hosts. |
| Schema | A record in `domains-detailed.json` lacks a field, has the keys in a different order, or has a wrong format of `zip`, `ico`, `id`, `kind` / `level`, `mx` or `sources`. |
| DNS | A new domain has no `MX`, `A` or `AAAA` record, or is parked. |
| Sensitive changes | The PR removes blocklist entries, changes the `kind` of a record, moves a record into the discount list or adds more than 200 domains, and has no `maintainer-approved` label. |
| Package | `packages/ts/package.json` has runtime dependencies or install-time scripts, the build (ESM, CommonJS, `.d.ts`) fails, or a test fails. |
| Examples | The Python, PHP, Go or shell example gives a different answer than the package for the same input. |

## Change how input is parsed

The rules live in five places that must stay in step: `packages/ts/src/index.ts` and `examples/{python,php,go,shell}`. The cross-language test (`packages/ts/test/examples.test.ts`) fails when they disagree.

1. Change the package and all four examples.
2. Add every new input you care about to `packages/ts/test/cases.ts`, with the expected host and match, in the fitting group.
3. Run `npm test` in `packages/ts` with Python 3, PHP 8 (with `ext-intl`), Go and bash installed, and `REQUIRE_EXAMPLE_RUNTIMES=1`, so that nothing is skipped. The tests need Node.js 22.18 or newer; the published package runs on Node.js 18+.

- When in doubt, return `null`: an ambiguous input must never match.
- Write invisible and confusable characters as escapes (`"\u200b"`), never literally.

## Maintainers

- `.github/CODEOWNERS` names the maintainers. `main` is protected by a ruleset: changes go through a pull request with a code owner's review and passing `data` and `test` checks.
- Labels: `maintainer-approved` (the PR check needs it for sensitive changes), `new-school` and `correction` (set by the issue forms).
- Releases: push a `vX.Y.Z` tag on a commit on `main`. The `npm` environment needs a reviewer's approval before publishing, and `v*` tags are protected. After the first publish, switch to npm Trusted Publishing (see the comment at the top of [`release.yml`](.github/workflows/release.yml)).
- After a larger data change, update the counts in `README.md` and `README.cs.md` and redraw the chart with `node scripts/render-chart.mjs`.
- Refresh the Public Suffix List now and then:
  ```bash
  curl -fsSL https://publicsuffix.org/list/public_suffix_list.dat -o scripts/public_suffix_list.dat
  ```
