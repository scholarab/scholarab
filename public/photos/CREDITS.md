# Image credits

The images in this folder are **not** covered by the repository's licenses (AGPL-3.0 for code, CC BY-SA 4.0 for data). Each one stays under its own terms, listed below. Do not reuse them on the strength of this repository's license.

## Photos

| File | Page | Photographer | Source | License | Added |
| --- | --- | --- | --- | --- | --- |
| `backdrops/calgary-*.webp` | /scholarships/calgary/ (full-page background) and its header menu tile | Igor Kyryliuk and Tetiana Kravchenko | Unsplash, photo `n4mvQ1YWk1U` (https://unsplash.com/photos/n4mvQ1YWk1U) | Unsplash License | 2026-09-13 |
| `backdrops/edmonton-*.webp` | /scholarships/edmonton/ (full-page background) and its header menu tile | Alex Pugliese | Unsplash, photo `u2tSj5H3rXQ` (https://unsplash.com/photos/u2tSj5H3rXQ) | Unsplash License | 2026-09-13; the wide and tall background crops were replaced 2026-09-14 with a cream-toned edit of the same photo made in ChatGPT (the tile keeps the original grade) |
| `backdrops/national-*.webp` | /scholarships/national/ (full-page background) and its header menu tile | Caio Silva | Unsplash, photo `l3mNDwVVT10` (https://unsplash.com/photos/l3mNDwVVT10) | Unsplash License | 2026-09-13 |
| `backdrops/fort-mcmurray-*.webp` | /scholarships/fort-mcmurray/ (full-page background) and its header menu tile | Rovi Matilla | Unsplash, photo `T2ItzSPzIxw` (https://unsplash.com/photos/T2ItzSPzIxw) | Unsplash License | 2026-09-13 |
| `backdrops/alberta-*.webp` | /scholarships/alberta/ (full-page background) and its header menu tile | Nataliia Kvitovska | Unsplash, photo `tTsdpwnLZ_s` (https://unsplash.com/photos/tTsdpwnLZ_s) | Unsplash License | 2026-09-13 |
| `paper/lined-*.webp` | /about/ (the sheet the story is written on) | Not recorded | Unsplash; Ilia downloaded it, and the photo's page was not recorded | Unsplash License | 2026-09-18 |

Unsplash License: free commercial use, no attribution required; a photo may not be sold unaltered or used to build a competing image service.

Each is made from the photographer's full-size original: a wide crop for landscape screens (`-wide-1672`, `-wide-3344`), a portrait crop for phones (`-tall-1000`, `-tall-2000`) and a 480x500 menu tile (`-tile`). All are lightly graded (shadows lifted, saturation down 10%, warmed toward the site's cream, the lowest part of the frame softened) and encoded as WebP at quality 80 (74 for tiles). The ruled-paper scan is cut into the top 1073 rows (`lined-top`) and an 11-rule band that repeats below it (`lined-band`), both at the scan's native 1326px width, WebP quality 78. To add a photo for another scope, keep the same five files and set `backdrop` on the facet in src/lib/facets.ts.

## Videos

The homepage hero plays these twelve clips in a crossfading loop from `public/video/hero/`, in the order set by `HERO_CLIPS` in src/pages/index.astro. `poster.webp` is the first frame of `01.mp4` and is what phones, reduced-motion and Save-Data visitors see.

| File | Shows | Videographer | Source | License | Added |
| --- | --- | --- | --- | --- | --- |
| `video/hero/01.hevc.mp4`, `01.mp4` | Calgary skyline in fall, aerial | Donovan Kelly | Pexels, video `29351084` (https://www.pexels.com/video/29351084/) | Pexels License | 2026-09-18 |
| `video/hero/04.hevc.mp4`, `04.mp4` | Edmonton skyline at dusk | vignesh srivatsav | Pexels, video `36321882` (https://www.pexels.com/video/36321882/) | Pexels License | 2026-09-18 |
| `video/hero/06.hevc.mp4`, `06.mp4` | Edmonton skyline, winter twilight | vignesh srivatsav | Pexels, video `36145450` (https://www.pexels.com/video/36145450/) | Pexels License | 2026-09-18 |
| `video/hero/07.hevc.mp4`, `07.mp4` | North Saskatchewan River at twilight | Joerg Schlagheck | Pexels, video `34581096` (https://www.pexels.com/video/34581096/) | Pexels License | 2026-09-18 |
| `video/hero/08.hevc.mp4`, `08.mp4` | Edmonton ravine, aerial | Joerg Schlagheck | Pexels, video `12555514` (https://www.pexels.com/video/12555514/) | Pexels License | 2026-09-18 |
| `video/hero/10.hevc.mp4`, `10.mp4` | River scenery, Alberta | Andrian Balan | Pexels, video `12747748` (https://www.pexels.com/video/12747748/) | Pexels License | 2026-09-18 |
| `video/hero/12.hevc.mp4`, `12.mp4` | Moraine Lake at sunrise | Joshua Woroniecki | Pexels, video `20625752` (https://www.pexels.com/video/20625752/) | Pexels License | 2026-09-18 |
| `video/hero/13.hevc.mp4`, `13.mp4` | Rocky Mountain peaks at sunset | Joshua Woroniecki | Pexels, video `20583716` (https://www.pexels.com/video/20583716/) | Pexels License | 2026-09-18 |
| `video/hero/16.hevc.mp4`, `16.mp4` | Canmore | Edward Rode | Pexels, video `16478838` (https://www.pexels.com/video/16478838/) | Pexels License | 2026-09-18 |
| `video/hero/17.hevc.mp4`, `17.mp4` | Badlands, aerial | Scott Unfried | Pexels, video `17207185` (https://www.pexels.com/video/17207185/) | Pexels License | 2026-09-18 |
| `video/hero/18.hevc.mp4`, `18.mp4` | Golden wheat in the breeze | †reny aleksa | Pexels, video `30178060` (https://www.pexels.com/video/30178060/) | Pexels License | 2026-09-18 |
| `video/hero/20.hevc.mp4`, `20.mp4` | Sunset behind tall grasses | Jessica Lewis (thepaintedsquare) | Pexels, video `17601826` (https://www.pexels.com/video/17601826/) | Pexels License | 2026-09-18 |

Pexels License: free commercial use, no attribution required; a clip may not be sold unaltered or used to imply endorsement by the people or brands shown. Each clip is a 12-second take cut from Pexels' 1920x1080 download, starting 1 second in, kept at 1920x1080 and at the source frame rate (24, 25 or 30 fps; 60 fps sources are halved to an exact 30, since dropping frames unevenly makes camera moves stutter). Two encodes per clip, no audio: `.hevc.mp4` is H.265 (tagged hvc1) at CRF 23 capped at 4.5 Mbps, the format and bitrate spacex.com serves for its own hero (measured 2026-09-18: 1920x1080, 23.976 fps, HEVC at 4.1 Mbps); `.mp4` is H.264 at CRF 21 capped at 5 Mbps for browsers that cannot decode H.265. Timelapses and clips shorter than 12 seconds were dropped on 2026-09-18, which took the set from 26 clips to 12.

## Removed

- A ChatGPT-made Calgary illustration served as this page's background earlier on 2026-09-13 and was replaced by the photo above.
- Pexels photo banners for /scholarships/calgary/, /scholarships/alberta/ and /scholarships/national/ were added and removed on 2026-09-13.

None of the removed images remain in the repository's current tree.
