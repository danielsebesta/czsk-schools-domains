# Changes (2026-11-25 verification pass)

Every domain was re-classified from its live homepage by two models (DeepSeek V4.1 Flash, Mistral Large 4), and about 2500 questionable ones were additionally checked by a web-browsing agent.

- Discount list: see the final numbers in the latest pass at the end of this file.
- Removed: municipality/town portals, parked or dead domains, companies, research institutes, forest clubs and other non-school or preschool-only entries.
- Added (53 verified replacements plus domains reclassified from preschool/unknown to school): school-specific hosts/domains found for municipal root domains, only when the homepage was fetched and classified as a school and the name matched.
- `UNCERTAIN.md`: decisions that could not be settled automatically; those domains keep their previous state.
- `domains-detailed.json` now has `kind`, `level`, `confidence`, `verified`.

Removed domains: see git diff of `data/domains.txt`.

## Registry confirmation (2026-11-25, second pass)

- Domains without a registry record were matched against the official registries
  (CZ RSSZ, SK RIS), school websites, parent university domains (swot/hipo/Wikidata) or contact pages.
  Domains confirmed by nothing else (468) were dropped; 40 more were confirmed by IČO/IZO/EDUID scraped from their sites and looked up in the registries (RSSZ, ARES, RPO).
- New domains: ~370 Slovak (RIS dataset) and ~180 Czech (RSSZ directory) school websites; ~430 real domains
  found from the e-mail domains on contact pages of schools hosted on edupage/webnode and similar platforms.
- Discount list now 7573 domains, all-list 9727. 170 entries remain unverified (`UNCERTAIN.md`).
- SK schools missing from the active eduZoznam list (19 domains, e.g. closed/merged) are kept in domains-all with registry_status but removed from the discount list.

## Third pass (2026-11-25)
- School links collected from municipality websites' school directories (e.g. bytca.sk) and verified: ~95 new domains.
- Moved/renamed domains found by a web-search agent for dropped domains (e.g. 8zskladno.cz -> 8zsamskladno.cz) and confirmed by registry match: 52.
- Final: discount list 7652, all-list 9854. 468 unconfirmed domains stay out of the data.

## Fourth pass (2026-11-25)
- Second review of uncertain entries by a web agent: kept/replaced/dropped where it was sure (confidence >= 80); new school domains only if confirmed by registry match.
- The dropped domains were re-checked with RDAP registrant organisation + Wayback snapshots (20 more matched to the registry).
- Final: discount list 7657, all-list 9876; 450 dropped domains remain unconfirmed.

## Fifth pass (2026-11-25)
- Resolved all 99 remaining uncertain domains via live multi-page scraping, DNS/MX inspection, and `mistral-large-4` (`high` effort) verification:
  - Kept 21 verified school and student/staff email-only domains (including `dius.cz`, `vslib.cz`, `vsp.cz`, `infovsem.cz`, `praguecollege.cz`, `rek.zcu.cz`, `student.*.cz`, `zak.gvid.cz`, `uc.oaol.cz`, `scioskoly.cz`, `kralovskaskola.cz`, `yamahazus.sk`, etc.).
  - Dropped 78 domains (municipal portals, commercial companies/courses, leisure clubs, shared hosting roots like `6f.sk`/`cogito.cz`/`uhedu.cz`, typos like `scoskola.cz`/`zsmshlalze.cz`/`vitkovickastrendni.cz`, driving school `zus.horazdovice.cz`, parked/hijacked domains, and dead NXDOMAIN/404 domains).
  - Restored/added 2 registry-confirmed live domains (`sjske.sk` replacing `netkosice.sk`/`sjs.netkosice.sk`, and `skolahat.cz` replacing `hat.cz`/`skola.hat.cz`).
- Dataset audit cleanup:
  - Removed 2 malformed duplicates (`soslevice.sk\xa0`, `zshorakhk..cz`), US parent university `ncsu.edu` (keeping `prague.ncsu.edu`), and 11 non-school catering/SaaS/institute domains (`primirest.cz`, `bionea.cz`, `ceskajidelna.cz`, `gastron.cz`, `jidelna.com`, `jidelnanamarjance.cz`, `jj.cz`, `mujobed.cz`, `zdraveskolnijidlo.cz`, `nidv.cz`, `plaveckaskolazlin.cz`).
  - Excluded 202 standalone school support facilities (canteens, youth dormitories, PPP/CPP/SPC counseling centers, and children's homes without their own school) from `domains.json` while keeping them in `domains-all.json`.
- Final: discount list 7367, all-list 9786; 0 uncertain domains remaining (`UNCERTAIN.md`).

## Sixth pass (2026-11-25)
- Ran full DNS / MX audit across all 7367 discount domains (`scripts/check-mx.mjs`) and reviewed non-`.cz`/`.eu`/`.sk` TLDs:
  - Added 32 dead domains (`ENOTFOUND`/`ESERVFAIL`/`ETIMEOUT`/`ENODATA`), 2 Bodis-parked domains (`ddmveseli.cz`, `old.vsmiep.cz`), US university `tiffin.edu`, and 3 non-`.cz`/`.sk` shared/municipal domains in `domains-all.json` (`sites.google.com`, `materska-skola.com`, `obecbiskupice.com`) to `data/blocklist.json`.
  - Added 23 verified live replacement domains to `data/custom-domains.json` (`zsbukovina.cz`, `svcslovacko.cz`, `zusandel.cz`, `zspopice.cz`, `skola.rudice.cz`, `skolyvybezek.cz`, `sukromnazusmichalany.webnode.sk`, `vshe.cz`, `sziliceisuli.webnode.sk`, `szusnovesady.edupage.org`, `szus-liveart.cz`, `zs-hnevkovice.webnode.cz`, `zsfatranskanr.edupage.sk`, `zrakopava.eu`, `zskuzelov.edupage.org`, `skolaskalicka.cz`, `zsmsolesnik.cz`, `zsmstechonin.cz`, `zsmsverovany.cz`, `zsmsvysocany.cz`, `zussabinov.sk`, `zusstropkov.edupage.org`, `zusziarnadhronom.edupage.org`).
- Final: discount list 7355, all-list 9771; 0 dead DNS domains remaining.

## Seventh pass (2026-11-25): names and addresses
- `domains-detailed.json` has new fields `address`, `city`, `zip` (formats in README). Coverage: 9746 of 9768 records.
  Sources: CZ school registry (7598), SK school registry (1913), ARES (148), RPO (86), school website (3).
- Names unified:
  - Legal forms are written one way (`, s.r.o.`, `, o.p.s.`, `, z.ú.`, `, a.s.`, `, příspěvková organizace`). Spaced en/em dashes became ` - `.
  - 27 ALL-CAPS names were rewritten in normal case; brand names (e.g. ART & DESIGN INSTITUT) were kept.
  - 8 names that were only a domain or a generic word got the registry name.
- 36 schools without `id` were matched to the school registry (registry name, street and web; checked by Mistral Large 4 and by hand).
  They got `id`, `ico` and the registry name (e.g. `8zskladno.cz` -> 600044084, `zsstefanikalc.sk` -> ZŠ M. R. Štefánika, Lučenec).
- Universities:
  - IČO taken from ARES / RPO / the MŠMT register of universities for 63 domains; 21 faculties inherited it from the parent domain.
  - `uniba.sk`, `upce.cz`, `unob.cz` and `vsmu.sk` carried a faculty name and are now the university records (`kind: vs`).
  - Renamed or merged schools carry the current name (e.g. `vsss.cz` -> Evropská výzkumná univerzita, `bivs.cz` -> Ambis Univerzita, `vfu.cz` -> Veterinární univerzita Brno).
- Removed: `9zs.kladno.indos.cz` (dead subdomain on a hosting platform) and `materskeskolky.cz` (hosting platform used by 6 different kindergartens; not in the discount list).
- `scripts/build-lists.mjs`:
  - Keeps `address` / `city` / `zip` for `custom-domains.json` entries.
  - No longer writes `false` into `name` / `ico` / `id` for string entries.
- Final: discount list 7373, all-list 9768.

## Eighth pass (2026-11-25): dead, closed and mail-less domains; university and VOŠ registers

- Dead DNS: 110 domains removed (103 NXDOMAIN, 6 SERVFAIL, 1 empty zone, checked on two public DNS-over-HTTPS resolvers). 105 of them were kindergartens; none was in the discount list.
- Closed schools (SK RIS "zrušená" / "vyradená", or closure stated on the school website):
  - 13 domains whose `id` pointed at a closed or merged unit now point at the active school that uses the domain (RIS parent, successor or website),
    e.g. `ssmk.sk` -> the merged school in Veľký Krtíš, `stkdn.sk` -> the active private dance conservatory in Trnava (EDUID 100002946), `funiversity.eu` -> now a kindergarten (out of the discount list).
  - 7 removed (no active successor uses the domain): `sjsbytca.sk`, `zsbrestovec.edu.sk`, `zskosariska.sk`, `soupoltar.edu.sk`, `msdukelska.sk`, `msrozkvet2024.sk`, `nasaskola.sk`.
- No pupils: `sssp.sk` and `zsdolnastreda.sk` are registered without pupils and are out of the discount list.
- Universities checked against the registers:
  - CZ MŠMT register (53 schools): all covered. `ucp.cz`, `vshe.cz`, `vsmvv.cz` now point at University College Prague (merger);
    the IČO of `mendelu.cz` and `upol.cz` is fixed (a kindergarten's IČO was there).
  - Out of the discount list (not in the MŠMT register: no accreditation, ceased, or business courses): `vso.cz`, `vso-praha.eu`, `vskv.cz`, `vske.cz`, `vsoh.cz`,
    `pbs-education.cz`, `interpragueuniver.cz`, `mpu-prague.cz`, `vsp.cz`.
  - SK portalvs.sk register: added `eszu.sk` (Slovenská zdravotnícka univerzita), `ambis.sk` (Ambis Univerzita) and `varsovia.sk` (Varsovia, former Collegium Humanum).
- VOŠ (CZ school registry, 168 schools): 166 covered; added `vos.volyne.cz` and `sps.volyne.cz`. The SK registry has no separate VOŠ type.
- New field `mx` in `domains-detailed.json` (see README). 840 domains have no MX; they are kept for URL matching.
  For schools whose website domain has no MX, the e-mail domain from the official registry was added when it is the school's own domain
  (checked on its homepage by Mistral Large 4 and with an MX record): 49 domains, e.g. `cg-plzen.cz`, `tgm-svitavy.cz`, `zuspb.cz`.
- `scripts/build-lists.mjs` keeps `mx` for `custom-domains.json` entries.
- Final: discount list 7409, all-list 9706.

## Ninth pass (2026-11-25): independent review

Seven independent reviewers checked the data against the registries (RSSZ, RIS, ARES, RPO, MŠMT and portalvs.sk university registers), DNS on two public resolvers and the live websites, plus the build, the package and the docs. A random sample of 200 discount-list domains had 2 high-severity errors (about 1 %). The confirmed problems were fixed as listed below; findings the reviewers were unsure about (mostly name-only guesses) were left unchanged.

- Removed (48):
  - municipal, ISP and hosting root domains where only the school's own host belongs in the data (`kt.cz`, `tatobity.cz`, `rostin.eu`, `solinky.sk`, `edulife.sk`, `plzen-edu.cz`, `w1.cz`, `zanet.sk` and others; the school hosts such as `sszp.kt.cz` stay);
  - parked, expired or re-registered domains (`vyssibrod.cz`, `czsms.cz`, `issunicov.cz`, `zsslatinany.net`, `edukomplex.cz`, `zsseberov.cz` and others);
  - hijacked or dead sites without mail (`sospza.sk`, `soslbs.sk`, `zameklomnice.cz`, `zakladni-skola-tetin.cz`, `zusesuchona.bratislava.sk` and others);
  - domains of other organisations (`helendoron.cz`, `klubicko.cz`, `vsp.cz`) and the closed Prague City University (`praguecityuniversity.cz`).
- Restored 3 domains removed in the eighth pass by mistake: `nasaskola.sk` (active private secondary school) and `msdukelska.sk` / `msrozkvet2024.sk` (now run by MŠ Železničná, Považská Bystrica).
- Added 9: faculties `damu.cz`, `hamu.cz`, `fsvladislava.sk`; foreign universities on the MŠMT list `humanitaspraha.cz`, `huni.cz`, `fves.eu`; `skolaspecialistu.cz` (ART ECON VOŠ), `zs16.plzen-edu.cz`, `zsjelka.sk`.
- 27 domains re-linked to the school that really uses them, e.g. `bigycb.cz` -> Biskupské gymnázium České Budějovice, `gym-cl.cz` -> Gymnázium Česká Lípa, `zuspraha9.cz` -> ZUŠ Praha 9, `zochova.sk` -> SPŠ elektrotechnická Zochova; Slovak branch units ("elokované pracovisko") -> their main school.
- Discount list:
  - out (23): counselling centres, children's homes and youth-care institutes without a school (e.g. `cppnitra.sk`, `ddduba.cz`, `vum.cz`), kindergarten-only domains, `akcent.cz` (commercial courses), `hodice.cz` (municipal domain), `praguecollege.cz` and `vsap.cz` (not in the MŠMT register);
  - in (2): special schools with pupils `specialnaskola.sk`, `spojvojke.sk`.
- `kind`: 169 support facilities that were `special` are now `other_edu` (or `ms` with a kindergarten); Slovak combined schools follow their highest school type; university parts that are not faculties are `other_edu`.
- Universities:
  - Correction to the eighth pass: the institution in the MŠMT register behind `ucp.cz` is United vysoká škola, s.r.o. (IČO 25619161); `ucp.cz`, `vshe.cz`, `vsmvv.cz` use it.
  - `selyeuni.sk` -> Univerzita J. Selyeho; `ujak.cz` -> Ambis Univerzita (part of AMBIS since 2023); `filmovka.cz` is now the university record of FAMO; current names of `vskk.cz`, `vsemba.sk`, `vsemvs.sk`, `vsm.sk`, `huaja.org`, `aauni.edu`.
  - `vsmt.cz` has its own seat in Moravská Třebová (not the Univerzita obrany seat).
- IČO: 20 Slovak schools without an IČO of their own carried another organisation's IČO, now `null`; `vso.cz` carried a foundation's IČO; 4 missing IČOs filled.
- Names: Czech records with a registry id use the registry full name; registry typing quirks are normalised (missing space after a comma, trailing full stop, half-spaced dashes, spaces inside quotes).
- `mx`: 17 domains whose MX points to a mail server that does not exist are now `false`; `maplebear.cz` is `true`.
- Package (`czsk-schools-domains`): an `@` in a URL path, query or fragment no longer selects the host (`https://evil.example/?a=x@zcu.cz` matched `zcu.cz`); hosts are validated; `mailto:` and `Name <a@b.cz>` are accepted; `createChecker` normalises its list; `schoolDomains` is frozen. The Python, PHP and Go examples have the same fix.
- Build and checks:
  - `scripts/build-lists.mjs` reads only `domains-detailed.json`, `custom-domains.json` and `blocklist.json` (the generated lists are no longer inputs); `custom-domains.json` entries only override the fields they set and follow the same discount rules.
  - `custom-domains.json` entries are plain domains now (their stale names overrode registry fixes).
  - `scripts/validate-pr.mjs` checks the full record schema.
  - The CI smoke tests check the actual result.
  - Line endings of `blocklist.json` and `UNCERTAIN.md` are LF.
- Final: discount list 7372, all-list 9670.

## Tenth pass (2026-11-25): security, privacy and licence review

Four independent reviewers checked the package and example code, the CI and release workflows, the takeover risk of every listed domain (DNS on two public resolvers, RDAP / WHOIS for suspects) and privacy and licensing.

- Package (`czsk-schools-domains`), bypasses fixed:
  - `zcu.cz/@evil.example` (an address at `evil.example`) matched `zcu.cz`; so did several recipients (`a@evil.example, b@zcu.cz`), comments, `mailto:` with `?cc=`, and URLs with a backslash (`https://evil.example\@zcu.cz`).
  - Ambiguous input now returns `null`; non-string input returns `null` instead of throwing; IP addresses are not domains; `createChecker` throws on invalid entries.
  - The Python, PHP, Go and shell examples use the same rules. The bypass inputs are in the unit tests.
- PR checks:
  - The PR's data is validated with the base branch's scripts, so a PR cannot weaken its own checks.
  - Public suffixes (vendored Public Suffix List), free-mail / alias / free-subdomain providers (`onmicrosoft.com`, `eu.org`, `duckdns.org` and others) and shared-hosting roots are refused, including the domain itself.
  - Removing blocklist entries, changing the `kind` of an existing record, moving it into the discount list, or adding more than 200 domains needs the `maintainer-approved` label.
  - A new community domain needs `name` and `kind` and starts as `verified: false`, `confidence: 50`. Install-time scripts and dependencies in the package are refused.
- Workflows:
  - Actions are pinned to commit SHAs; `persist-credentials: false`, timeouts and concurrency are set.
  - Release: the tag must be `vX.Y.Z` on a commit on `main`; build, publish (protected `npm` environment, `--provenance`, `--ignore-scripts`, prereleases under `next`) and the GitHub release run as separate jobs with their own permissions.
  - The DNS audit covers `domains-all.json` and only touches its own issues. Dependabot and an issue template for corrections and removals were added.
- Removed (104):
  - the only or a fallback MX host is under an unregistered domain, so anyone could register it and receive the school's mail (`lmszemekvitka.cz`, `msdetska.cz`, `skolaraspenava.cz`), and domains re-registered by spam or gambling sites (`gmhtrstena.sk`, `msmorbudejovice.com`, `msseverni.cz`). Together with the municipality domains `obecjestrabi.cz` and `obecplavec.cz` they are also on `blocklist.json`;
  - domains recently re-registered by drop-catchers or showing unrelated content, all without MX (`skolahotelnictvi.cz`, `msobrnice.cz`, `zsms-litohor.cz` and 7 more);
  - expired, or expiring within 60 days with dead mail or a parked page (`14zsplzen.cz`, `zstvrdosovce.sk`, `zskalnica.sk`, `mskapitanova.sk`, `pohadka-skolka.cz`);
  - 40 web-only domains (no working mail) whose registered domain expires within 60 days, so a drop-catcher could take them over (`specialniskolatrutnov.cz`, `zs.zacler.cz`, `ms-slunicko.cz` and 37 more; 17 were in the discount list). `web.utb.cz` was one of them; addresses there still match through `utb.cz`. Six domains from the same check have working mail and stay (`utb.cz` with two subdomains, `zs-ns2.cz`, `zs.rotava.cz`, `zuszdounky.cz`);
  - domains whose DNS lets an outside party take part: a backup MX host on a typo domain owned by someone else (`zus-vlasim.cz`, `zsnechanice.cz`; the primary MX is Google) or a nameserver in the school's own zone under an unregistered domain (`konzervatorium.sk`, `ddplumlov.org`). They are on `blocklist.json` too; a maintainer can lift that once the DNS is fixed;
  - abandoned subdomains on free hosting platforms (`*.w1.cz`, `*.ic.cz`, `mskrhanice.wbs.cz`, `mskrhova.blog.cz`);
  - 30 domains that neither a register nor the school's own web site confirms as the school's (see below).
- Independent confirmation: 627 domains had so far been confirmed only indirectly (the second pass had only re-tagged them after a registry match).
  - 152 are listed by a register (CZ RSSZ / SK RIS) and 442 are confirmed by the school's own web site (IČO, RED_IZO / EDUID or the official name on the page; faculties on their university's domain). Their `sources` now say which.
  - 30 were removed (listed above) and 3 had been removed for other reasons.
- Discount list, out (10): research centres, campuses and rectorates with staff mailboxes (`ceitec.muni.cz`, `ntc.zcu.cz`, `rek.zcu.cz`, `rektorat.czu.cz` and others). The university's own domain stays.
- Privacy:
  - 6 official names that contain the name of the living founder or director now use a neutral name (type of school and town); the `id` still identifies the school.
  - For 3 schools run by a natural person only the town is given; `rubikon-no.sk` no longer carries an IČO taken from its web page.
  - Example and test addresses use role addresses (`student@`, `info@`).
- Licence:
  - The data is under CC BY 4.0 (the Slovak school register and RPO are CC BY 4.0, so CC0 was not possible); the code stays MIT.
  - Source attributions and the swot / Hipo MIT texts are in `THIRD_PARTY_NOTICES.md`. swot is MIT, not Apache-2.0. RPO has been run by the Ministry of the Interior since June 2026.
  - The `sk-portalvs-register` source tag is gone (portalvs.sk allows non-commercial use only); the 4 records are confirmed by the universities' web sites.
- README: a security section (a match is not proof of student status; confirm the mailbox with a one-time code; age of digital consent) and a corrections and privacy section.
- Final: discount list 7312, all-list 9566, blocklist 267.

## Eleventh pass (2026-11-25): higher vocational schools (VOŠ)

- The VOŠ list on atlasskolstvi.cz (158 schools) was used only to find candidates; nothing is copied from it. 152 of the schools were already listed under the domain it gives, the other 6 under another domain of the same school.
- Added (19): web and e-mail domains of VOŠ that were already in the data under another domain (same RED_IZO). Each is confirmed by the school's own listed web site (it links to the domain, redirects to it or uses it for e-mail) or by the CZ register (RSSZ); names and addresses come from the register.
  - e.g. `vosis.cz`, `vosbrno.cz`, `akademiemichael.cz`, `vosezlin.cz`, `prumyslovkaliberec.cz`, `evolyne.cz` (VOŠ and SPŠ Volyně), `gsv365.cz` (the Microsoft 365 mail domain of the Ledeč nad Sázavou school) and 12 more.
  - `oa-vos.cz` and `trivis.info` are web sites without their own mail.
- Not added: `volyne.cz` (shared by several institutions, e.g. a ZUŠ with another IČO; the school's own domain is `evolyne.cz`), `cuscz.cz` (the Czech Sports Union, which runs VOŠ ČUS, not the school), `post.cz` (free-mail, on the blocklist).
- Final: discount list 7331, all-list 9585, blocklist 267.

## Twelfth pass (2026-11-25): input tests

- New tests in `packages/ts/test` of what people type and what attackers try:
  - `cases.ts`: 300 inputs in 11 groups, each with the expected host and match. The groups are everyday input, Unicode that maps to the same host (fullwidth letters, ideographic dots, copy-paste spaces), valid non-school addresses, homoglyphs, typos, IP addresses and special hosts, bypass attempts, invisible and bidi characters, injection payloads, the local part passed through, and URL schemes.
  - `inputs.test.ts`: the corpus, plus 30 000 generated inputs checked against the WHATWG URL parser and an address oracle (one `@`, plain local part). A listed domain is mixed with an attacker's domain and separators, and must match only when the mail really goes to the school. Also covered: 2 KB adversarial inputs under 50 ms (ReDoS), values that are not strings, detached functions, `createChecker` edge cases, the published list against `data/domains.json`, the blocklist and free-mail providers, and the README examples.
  - `examples.test.ts`: the same inputs, plus 6 000 generated ones, go through the Python, PHP, Go and shell examples in batch mode; each must give the same answers as the package. In CI, `REQUIRE_EXAMPLE_RUNTIMES=1` fails the test when a runtime is missing (the job now sets up Go and PHP `ext-intl`).
  - A mutation check (17 deliberate bugs in the compiled package) was run by hand: 15 are caught, and the other 2 change dead code only.
- Fixes found by the tests (package and examples alike):
  - More than one `@`, or a `:` in an address (source route `@relay.example:x@school.cz`), is refused. Before, the host after the last `@` was used.
  - Invisible and bidi formatting characters (zero-width space, soft hyphen, right-to-left override, variation selectors, tag characters) are refused. Before, IDNA deleted some of them silently, so `zcu\u200b.cz` matched `zcu.cz`.
  - Unicode spaces (no-break space, ideographic space and the like) inside an address are refused, as ASCII spaces already were.
  - Exactly one trailing dot is removed, after the IDN conversion, everywhere (PHP removed all of them; TS and Python could remove two).
  - The examples now require, as the package does, a top-level domain that contains a letter and does not start or end with `-`.
  - PHP: a regex error (for example on invalid UTF-8) now returns "not a school" instead of skipping the check, and IDN conversion checks bidi and joiner rules as the other implementations do.
  - Python: the 2 048-character limit counts UTF-16 units as JavaScript does; `ß` and final sigma in IDN hosts are refused (they map differently under IDNA 2003 and 2008).
  - Python, PHP and Go: leading and trailing whitespace is trimmed with the same character set as JavaScript `trim()`.
  - Shell: runs with `LC_ALL=C`; anything but exactly one plain address or host (no argument, several arguments, an option, a newline) ends with exit code 2 and "unsupported input".
- The Python, PHP and Go examples have a batch mode (`--json`, Go `-json`) for the cross-language test.
- README: the security section says that only the domain is checked (escape the local part yourself; a matching URL is not a safe link) and lists the refused inputs; a Tests entry was added. CONTRIBUTING: how to change the parsing rules in all five places.
- Data unchanged: discount list 7331, all-list 9585, blocklist 267.
