# Third-party notices

The domain lists in `data/` and in the npm package `czsk-schools-domains` contain facts taken from the sources below.
The data as a whole is released under CC BY 4.0 (see [LICENSE-DATA.md](LICENSE-DATA.md)); these notices must be kept
when you redistribute it.

## Attributions

- **Slovakia – school register:** Zdroj: Register škôl a školských zariadení, Ministerstvo školstva, výskumu, vývoja a mládeže SR,
  [data.gov.sk](https://data.gov.sk/set/437907ab-fa48-4a28-a0ba-e8d9df5c4146), licence CC BY 4.0.
- **Slovakia – register of legal persons (RPO):** Zdroj: Register právnických osôb, podnikateľov a orgánov verejnej moci
  (Ministerstvo vnútra SR; until 31 May 2026 Štatistický úrad SR), licence CC BY 4.0.
- **Czech Republic – school register:** Rejstřík škol a školských zařízení, MŠMT, open data
  ([NKOD](https://data.gov.cz/), terms of use "neobsahuje autorská díla").
- **Czech Republic – ARES:** Administrativní registr ekonomických subjektů, Ministerstvo financí ČR (public register data).
- **Czech Republic – universities:** MŠMT register of universities and the MŠMT list of foreign higher-education institutions
  (public administration data).
- **Wikidata:** website properties of schools, CC0 1.0.
- **JetBrains/swot** (https://github.com/JetBrains/swot): academic domain list, MIT licence, text below.
- **Hipo/university-domains-list** (https://github.com/Hipo/university-domains-list): MIT licence, text below.

Every listed domain was also checked against a register or the school's own web site or e-mail contact, and against DNS.

## JetBrains/swot

```
The MIT License (MIT)

Copyright (c) 2013 Lee Reilly

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

## Hipo/university-domains-list

```
The MIT License (MIT)

Copyright (c) 2014-2025 Hipo

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Public Suffix List (CI only)

`scripts/public_suffix_list.dat` is an unmodified copy of the [Public Suffix List](https://publicsuffix.org/), used by the
PR checks only. It is distributed under the Mozilla Public License 2.0 (see the header of the file) and is not part of the
data or of the npm package.
