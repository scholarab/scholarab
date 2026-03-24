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
     "id": 99,
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
   - `category`: `Community` | `Academic` | `STEM` | `Indigenous` | `Arts` | `Trades`
   - `region`: `Medicine Hat` | `Alberta-wide` | `National` | `Lethbridge` | `Calgary` | `Edmonton`
   - `active`: set to `true`; set to `false` once the scholarship is permanently discontinued
   - `lastVerified`: month you confirmed the listing is still active (e.g. `"2026-03"`)
   - `open_date`: omit if unknown; only set when applications open on a future date
4. Submit a pull request with the scholarship name in the title.