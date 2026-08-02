# ScholarAB Data License

ScholarAB is licensed in two parts. This file covers **the data**. The software is
covered separately by [LICENSE](./LICENSE) (GNU AGPL-3.0).

## What this covers

The ScholarAB scholarship and program database, meaning the contents of:

- `src/data/scholarships.json`
- `src/data/research-programs.json`
- `src/data/ab-high-schools.json`
- `src/data/ab-districts.json`

and any rendering of that database published on scholarab.ca, including the
listing pages, the search and filter indexes, and the generated sitemap.

## The license

The ScholarAB database is licensed under the
**[Creative Commons Attribution-ShareAlike 4.0 International License][cc]**
(CC BY-SA 4.0).

You are free to share and adapt it, including commercially, provided that:

- **Attribution** — you credit ScholarAB (scholarab.ca) as the source, visibly,
  on any page or product that displays the data, and you link back to
  https://www.scholarab.ca.
- **ShareAlike** — if you build on the database, remix it, or distribute a
  modified version, you release your version under CC BY-SA 4.0 as well. You
  may not fold this data into a closed or proprietary database.
- **No additional restrictions** — you don't apply legal terms or technical
  measures that stop anyone else from doing what this license permits.

[cc]: https://creativecommons.org/licenses/by-sa/4.0/

## What is being claimed, and what isn't

Individual facts are not owned by anyone. The deadline on an award, the dollar
amount, the URL of the official application page: those are facts, and this
license makes no claim over any single one of them. Anyone is free to go read
the same award page and write down the same date.

What this license does cover is the parts that took original work:

1. **The selection and arrangement of the database** — the judgment about which
   awards are real, current, and relevant to an Alberta high school student, and
   which are dead, duplicated, or out of scope.
2. **The written prose** — every `description`, `notes`, and `applyViaGuidance`
   field, and the guide text on the site. These were written by hand, not
   copied from the issuers.
3. **The structured eligibility model** — the `eligibility` object schema and the
   per-listing values in it, which are an interpretation of prose eligibility
   rules into a queryable form, not a transcription.
4. **The verification state** — `lastVerified`, `deadline`, `openDate`, and
   `active`, which represent an ongoing manual checking process rather than a
   one-time scrape.

Copying the listings wholesale, including the descriptions and the eligibility
structure, is copying items 1 through 4 and is governed by this license.

## Attribution format

Somewhere visible on any page displaying the data:

```
Scholarship data from ScholarAB (https://www.scholarab.ca), CC BY-SA 4.0.
```

## Contributions

Anything you contribute to the database by pull request is contributed under
this same license (CC BY-SA 4.0), and you confirm you have the right to
contribute it. Code contributions are under AGPL-3.0 per [LICENSE](./LICENSE).

## Trademarks

This license covers data and expression only. It grants no rights in the
ScholarAB name, wordmark, or logo. See [TRADEMARK.md](./TRADEMARK.md).

## Accuracy

The database is provided as-is with no warranty. Deadlines move and awards get
discontinued. Anyone redistributing it should carry that warning forward, and
should not present stale data as currently verified.

## Questions

Anything unclear, or a use you're not sure about: contact.scholarab@gmail.com.
Permission for uses beyond this license is usually available just by asking.
