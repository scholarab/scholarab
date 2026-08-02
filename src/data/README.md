# ScholarAB data — read before you copy this

The JSON files in this directory are **not** covered by the AGPL license in the
repository root. They are licensed separately, under
**[CC BY-SA 4.0](../../DATA-LICENSE.md)**.

In short, you may use this data, including commercially, if you:

1. **Credit ScholarAB** visibly and link to https://www.scholarab.ca, and
2. **Release your version under CC BY-SA 4.0** too. It cannot go into a closed
   database.

The ScholarAB name and logo are **not** licensed at all. Rename your fork.
See [TRADEMARK.md](../../TRADEMARK.md).

Full terms: [DATA-LICENSE.md](../../DATA-LICENSE.md).
Questions or a use you're unsure about: contact.scholarab@gmail.com.

## A practical note

The value in these files is not the JSON, it's the fact that every deadline was
checked by hand and that they keep getting re-checked. `lastVerified` is the
whole product. A copy of this directory starts decaying the day it is taken:
deadlines roll over, awards get discontinued, and application URLs move. If you
are going to use it, plan to maintain it, or you will be sending students to
closed applications within a few months.

If you'd rather not maintain it, contributing a correction upstream is easier
than forking. See the contribution section in the root [README](../../README.md).

## Files

| File | Contents |
|---|---|
| `scholarships.json` | Scholarship listings, with deadlines, eligibility, and verification state |
| `research-programs.json` | Research and summer program listings |
| `ab-high-schools.json` | Alberta high schools, for eligibility matching |
| `ab-districts.json` | Alberta school districts and boards |

`scholarships.json` and `research-programs.json` are the build source of truth.
Schema and required fields are enforced by `scripts/validate-data.ts`, which runs
on every build.
