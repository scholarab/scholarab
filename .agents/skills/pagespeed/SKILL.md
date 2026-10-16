---
name: pagespeed
description: Run PageSpeed Insights / Lighthouse on every ScholarAB page, mobile and desktop, and list the pages under 95. Use when asked for PageSpeed, Speed Insights, Lighthouse, page scores or the 95+ bar, and after a change to src/pages, src/components, src/layouts, src/styles or public/ before pushing.
---

The bar is 95+ in every category, mobile and desktop, on every page in the sitemap. One script measures it:

```
npm run pagespeed                         # live site via the PageSpeed Insights API, every page
npm run pagespeed -- --local              # the build in dist/, every page, 4 categories
npm run pagespeed -- --local --perf /map/ # adds performance, one page at a time
npm run pagespeed -- /match/ /saved/      # only these paths (either engine)
```

Which one:
- Before pushing a UI change, ship-check prints `RUN npm run pagespeed -- --local --strategy mobile`. Run it after the build (`npm run ci` builds). It covers accessibility, best practices, SEO and agentic browsing on every page in about 50 minutes. Measure performance locally only for the pages the change touched, with `--perf`, because parallel Chromes skew it.
- After a deploy, or whenever asked for PageSpeed itself, run the live engine. It is the same Lighthouse and Chrome as pagespeed.web.dev and includes performance. Do not poll for the deploy; run it when asked.

How to run it:
- A full pass takes tens of minutes. Start it with `run_in_background` and wait for the notification.
- Report the summary table and every `UNDER 95` and `ERRORED` line as printed. The last line says PASS or FAIL; never call it a pass without that line. Exit code 1 means a page is under the bar or a run failed three times.
- Rows land in `private/pagespeed/` (gitignored) as each run finishes. A stopped or killed run keeps them; add `--resume` to the same command to measure only what is missing. Compare with the previous file there rather than re-running, and never delete those files without reading them.
- Live quota is 25,000 runs a day, about four full passes. Use paths for spot checks.

Known, not code:
- A live 403 saying the API is disabled means the PageSpeed Insights API is off on the service account's Cloud project. The error prints the enable link. Only Ilia can click it.
- Pages missing from the sitemap (the `/all/` directory copies, closed listings, the 404) are noindex on purpose and exempt.
- Live Best Practices dips on every page at once point at Cloudflare's injected `/cdn-cgi/challenge-platform/.../jsd/main.js` (Bot Fight Mode JavaScript Detections), a dashboard setting, not site code.
