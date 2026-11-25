# Contributing to czsk-schools-domains

Contributions (missing schools, domain changes, or removals of dead/non-school domains) are very welcome!

## Adding or removing domains

You should never need to hand-edit the generated lists (`domains.json`, `domains.txt`, `domains-all.json`). `domains-detailed.json` is the curated source of truth (it cannot be regenerated from this repository alone); community changes go through the two high-priority override files:

1. **Add a missing school domain:** add an object to `data/custom-domains.json` (sorted by domain). A new domain needs at least `domain`, `name` and `kind`; the other fields are optional
   (`address`, `city`, `zip`, `ico`, `id`, `country`, `level`, `in_discount`, `mx`, `confidence`; see the field formats in the README). Link the school's web page or registry record that shows the domain in the PR description.
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
   `kind` is one of `zs`, `gymnazium`, `sos`, `konzervator`, `vos`, `vs`, `fakulta`, `zus`, `ddm`, `special`, `jazykova`, `other_edu`, `kurzy`, `ms`, `jesle`, `not_school`.
   A new entry starts with `verified: false` and `confidence: 50` until a maintainer checks it against a register.
   For a domain that is already in `domains-detailed.json`, only the fields set in the entry override the record; a plain string only keeps the domain listed.
   `in_discount` keeps the existing value unless the entry sets it. Kindergartens, nurseries, courses and non-schools (`kind` `ms`, `jesle`, `kurzy`, `not_school`) never enter the discount list.
2. **Block/remove a domain:** add the lowercase domain to `data/blocklist.json` (in alphabetical order). Entries in `blocklist.json` always take precedence over `custom-domains.json` and the base lists.
3. **Rebuild all output files** (this also updates `packages/ts/src/domains.json` and `domains-data.ts`):
   ```bash
   node scripts/build-lists.mjs
   ```
4. **Validate locally** before opening a Pull Request (`--base` compares with the main branch, as CI does):
   ```bash
   npm --prefix packages/ts ci --ignore-scripts
   node scripts/validate-pr.mjs --base origin/main
   ```

Never post personal data (names, private e-mail addresses, phone numbers) in issues or PRs. A school that wants a correction or removal can use the **Correction or removal** issue template.

## Automated PR checks

Every Pull Request runs `.github/workflows/pr-check.yml`. The data is validated with the scripts from the base branch (changes to `scripts/`, the workflows or the tests in the same PR do not affect that check):
- Valid lowercase hostname format (no `http://`, no paths, no `www.`, no IP addresses, no duplicates, sorted alphabetically).
- No domain is on `data/blocklist.json`, is a public suffix (Public Suffix List, including private suffixes such as `github.io` or `eu.org`), a shared-hosting root (`edu.sk`, `edupage.org`, `webnode.cz`, …), or a free-mail / alias / free-subdomain provider or one of its subdomains (`gmail.com`, `seznam.cz`, `onmicrosoft.com`, `duckdns.org`, `edu.cz`, …). Hosts under `edu.sk` are allowed only as individual verified school hosts.
- Every record in `domains-detailed.json` has the full schema in the documented key order (formats of `zip`, `ico`, `id`, `kind`/`level`, `mx`, `sources`).
- Newly added domains have an active DNS record (`MX`, `A`, or `AAAA`) and are not parked.
- Removing blocklist entries, changing the `kind` of an existing record, moving a record into the discount list, or adding more than 200 domains fails until a maintainer reviews the PR and adds the `maintainer-approved` label.
- `packages/ts/package.json` has no runtime dependencies and no install-time scripts.
- TypeScript build (ESM + CJS + `.d.ts`), unit tests and example smoke tests pass (running the `.ts` tests needs Node.js 22.18 or newer; the published package works on Node.js 18+).
- The input tests (corpus, fuzzing, ReDoS limits) pass, and the Python, PHP, Go and shell examples give the same answers as the package for the same inputs.

## Changing how input is parsed

The rules live in five places that must stay in step: `packages/ts/src/index.ts` and `examples/{python,php,go,shell}`. The cross-language test (`packages/ts/test/examples.test.ts`) fails when they disagree.
- Add every new input you care about to `packages/ts/test/cases.ts` with the expected host and match, in the fitting group.
- When in doubt, return `null`: an ambiguous input must never match.
- Run `npm test` in `packages/ts` with Python 3, PHP 8 (with `ext-intl`), Go and bash installed, and `REQUIRE_EXAMPLE_RUNTIMES=1` so that nothing is skipped.
- Write invisible and confusable characters as escapes (`"\u200b"`), never literally.

## Maintainers

- `.github/CODEOWNERS` names the maintainers. Protect `main` with "Require a pull request" and "Require review from Code Owners", and require reviews for PRs from outside collaborators.
- Create the labels `maintainer-approved` (the PR check needs it for sensitive changes) and `correction` (used by the issue template).
- Releases: create the `npm` environment with required reviewers, protect `v*` tags, and after the first publish switch to npm Trusted Publishing (see the comment at the top of `.github/workflows/release.yml`).
- Refresh the Public Suffix List now and then: `curl -fsSL https://publicsuffix.org/list/public_suffix_list.dat -o scripts/public_suffix_list.dat`.
