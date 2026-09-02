# 🎓 ScholarAB

**Live site:** [scholarab.ca](https://www.scholarab.ca)

The fastest, easiest way for students in Alberta to find scholarships.
No registration, open source, and free.

## 🚀 Why this exists
National scholarship databases are overwhelming and heavily gated. ScholarAB is a hyper-local, fast aggregator designed to remove friction. It does not collect user data and links students directly to the official application pages.

## 🛠️ Tech Stack
- **Framework:** [Astro](https://astro.build)
- **UI:** React & Tailwind CSS
- **Data:** Flat JSON structure

## 🤝 How to Contribute (Add a Scholarship)
This project is open source! If you know of a local scholarship that isn't on the list, you can add it easily:

1. Fork this repository.
2. Open `src/data/scholarships.json`.
3. Add a new JSON object to the array with the following format:
   ```json
   {
     "id": 126,
     "title": "Name of Scholarship",
     "amount": "$1,000",
     "deadline": "YYYY-MM-DD",
     "open_date": "YYYY-MM-DD",
     "audience": "Who qualifies for this?",
     "url": "https://link-to-application.com",
     "category": "Community",
     "region": "Medicine Hat",
     "active": true,
     "lastVerified": "YYYY-MM"
   }
   ```
   **Field reference:**
   - `id`: a unique integer not already used in `scholarships.json`
   - `category`: `Community` | `Academic` | `STEM` | `Indigenous` | `Arts` | `Trades`
   - `region`: `Medicine Hat` | `Alberta` | `Alberta-wide` | `National` | `Lethbridge` | `Calgary` | `Edmonton`
   - `active`: set to `true`; set to `false` once the scholarship is permanently discontinued
   - `lastVerified`: month you confirmed the listing is still active (e.g. `"2026-03"`)
   - `open_date`: omit if unknown; only set when applications open on a future date
4. Submit a pull request with the scholarship name in the title.

Contributions to the data are accepted under CC BY-SA 4.0; contributions to the code under AGPL-3.0.

## 📄 License

ScholarAB is open source, in two parts:

| Part | License | Terms |
|---|---|---|
| **Code** (everything except `src/data/*.json`) | GNU AGPL-3.0 | [LICENSE](./LICENSE) |
| **Data** (the scholarship and program database) | CC BY-SA 4.0 | [DATA-LICENSE.md](./DATA-LICENSE.md) |
| **Name and logo** | Not licensed | [TRADEMARK.md](./TRADEMARK.md) |

You can use the code and the data, including commercially. Two conditions: **credit ScholarAB and link back**, and **keep your version open under the same license**. The data cannot be folded into a closed database.

The ScholarAB name and logo are not covered by either license. A public fork has to be renamed. This isn't a restriction on the open source part, it's how nearly every open source project handles branding, and here it exists so that students who trust the name reach the version whose deadlines are actually being re-checked.

**Schools and counsellors don't need to ask.** Permission to use the ScholarAB mark to link to the site, on a guidance page, newsletter, or poster, is granted up front in [TRADEMARK.md](./TRADEMARK.md). The asset is at [`/brand/scholarab-mark.svg`](https://www.scholarab.ca/brand/scholarab-mark.svg).

### Third-party

The web fonts in `public/fonts/` (Archivo, Inter, Instrument Serif, Manrope, IBM Plex Mono) are the work of their respective authors under the SIL Open Font License 1.1, and are covered by neither license above. Notices and full license text: [`public/fonts/OFL.txt`](./public/fonts/OFL.txt).

If you want to do something these terms don't cover, just ask: contact.scholarab@gmail.com. Permission is usually easy to get.

## 🔐 Security

Vulnerability reports: see [SECURITY.md](./SECURITY.md). Please don't open a public issue for security problems.

Privacy and anti-spam: what the site collects and why is on [the privacy page](https://www.scholarab.ca/privacy/); the reasoning behind it, and what would have to change if ScholarAB ever earned money, is in [docs/compliance.md](./docs/compliance.md).

Commit history: The history was squashed in September 2026 because it contained hundreds of educator email addresses that were removed from the published data.