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

The homepage hero plays these clips in a crossfading loop from `public/video/hero/`. `poster.webp` is the first frame of `01.mp4` and is what phones, reduced-motion and Save-Data visitors see.

| File | Shows | Videographer | Source | License | Added |
| --- | --- | --- | --- | --- | --- |
| `video/hero/01.mp4` | Calgary skyline in fall, aerial | Donovan Kelly | Pexels, video `29351084` (https://www.pexels.com/video/29351084/) | Pexels License | 2026-09-18 |
| `video/hero/02.mp4` | Calgary cityscape in fall, aerial | Donovan Kelly | Pexels, video `29351086` (https://www.pexels.com/video/29351086/) | Pexels License | 2026-09-18 |
| `video/hero/03.mp4` | Calgary, drone | Max Medyk | Pexels, video `14569381` (https://www.pexels.com/video/14569381/) | Pexels License | 2026-09-18 |
| `video/hero/04.mp4` | Edmonton skyline at dusk | vignesh srivatsav | Pexels, video `36321882` (https://www.pexels.com/video/36321882/) | Pexels License | 2026-09-18 |
| `video/hero/05.mp4` | Edmonton skyline at sunset, aerial | vignesh srivatsav | Pexels, video `36074575` (https://www.pexels.com/video/36074575/) | Pexels License | 2026-09-18 |
| `video/hero/06.mp4` | Edmonton skyline, winter twilight | vignesh srivatsav | Pexels, video `36145450` (https://www.pexels.com/video/36145450/) | Pexels License | 2026-09-18 |
| `video/hero/07.mp4` | North Saskatchewan River at twilight | Joerg Schlagheck | Pexels, video `34581096` (https://www.pexels.com/video/34581096/) | Pexels License | 2026-09-18 |
| `video/hero/08.mp4` | Edmonton ravine, aerial | Joerg Schlagheck | Pexels, video `12555514` (https://www.pexels.com/video/12555514/) | Pexels License | 2026-09-18 |
| `video/hero/09.mp4` | Clouds over a meadow near Edmonton | August Domingo | Pexels, video `11321608` (https://www.pexels.com/video/11321608/) | Pexels License | 2026-09-18 |
| `video/hero/10.mp4` | River scenery, Alberta | Andrian Balan | Pexels, video `12747748` (https://www.pexels.com/video/12747748/) | Pexels License | 2026-09-18 |
| `video/hero/11.mp4` | Moraine Lake reflection | Joshua Woroniecki | Pexels, video `20600550` (https://www.pexels.com/video/20600550/) | Pexels License | 2026-09-18 |
| `video/hero/12.mp4` | Moraine Lake at sunrise | Joshua Woroniecki | Pexels, video `20625752` (https://www.pexels.com/video/20625752/) | Pexels License | 2026-09-18 |
| `video/hero/13.mp4` | Rocky Mountain peaks at sunset | Joshua Woroniecki | Pexels, video `20583716` (https://www.pexels.com/video/20583716/) | Pexels License | 2026-09-18 |
| `video/hero/14.mp4` | Above the clouds, Banff, timelapse | Joshua Woroniecki | Pexels, video `20687323` (https://www.pexels.com/video/20687323/) | Pexels License | 2026-09-18 |
| `video/hero/15.mp4` | Morant's Curve, Banff | Akash Malhotra | Pexels, video `19696936` (https://www.pexels.com/video/19696936/) | Pexels License | 2026-09-18 |
| `video/hero/16.mp4` | Canmore | Edward Rode | Pexels, video `16478838` (https://www.pexels.com/video/16478838/) | Pexels License | 2026-09-18 |
| `video/hero/17.mp4` | Badlands, aerial | Scott Unfried | Pexels, video `17207185` (https://www.pexels.com/video/17207185/) | Pexels License | 2026-09-18 |
| `video/hero/18.mp4` | Golden wheat in the breeze | †reny aleksa | Pexels, video `30178060` (https://www.pexels.com/video/30178060/) | Pexels License | 2026-09-18 |
| `video/hero/19.mp4` | Sun setting behind tall grass | AP Vibes | Pexels, video `27775386` (https://www.pexels.com/video/27775386/) | Pexels License | 2026-09-18 |
| `video/hero/20.mp4` | Sunset behind tall grasses | Jessica Lewis (thepaintedsquare) | Pexels, video `17601826` (https://www.pexels.com/video/17601826/) | Pexels License | 2026-09-18 |
| `video/hero/21.mp4` | Grass silhouettes at sunset | AP Vibes | Pexels, video `29300059` (https://www.pexels.com/video/29300059/) | Pexels License | 2026-09-18 |
| `video/hero/22.mp4` | Canola field at sunrise, aerial | Jay's Photography | Pexels, video `36872947` (https://www.pexels.com/video/36872947/) | Pexels License | 2026-09-18 |
| `video/hero/23.mp4` | Cumulus clouds over a plain, timelapse | Ndumiso Mvelase | Pexels, video `31775681` (https://www.pexels.com/video/31775681/) | Pexels License | 2026-09-18 |
| `video/hero/24.mp4` | Open sky over a dry field, timelapse | Ndumiso Mvelase | Pexels, video `32573013` (https://www.pexels.com/video/32573013/) | Pexels License | 2026-09-18 |
| `video/hero/25.mp4` | Tall grass under a blue sky | AP Vibes | Pexels, video `35551383` (https://www.pexels.com/video/35551383/) | Pexels License | 2026-09-18 |
| `video/hero/26.mp4` | Wild grass in the breeze | Christopher More | Pexels, video `39017939` (https://www.pexels.com/video/39017939/) | Pexels License | 2026-09-18 |

Pexels License: free commercial use, no attribution required; a clip may not be sold unaltered or used to imply endorsement by the people or brands shown. Each file is cut from Pexels' 1920x1080 download: 6 seconds starting 1.5 seconds in (the whole clip when shorter), kept at 1920x1080 and at the source frame rate (24, 25 or 30 fps; 60 fps sources are halved to an exact 30, since dropping frames unevenly makes camera moves stutter), H.264 at CRF 24 capped at 3 Mbps, no audio. The grainiest clips (08, 10, 18, 22, 26) are lightly denoised to stay under the cap.

## Removed

- A ChatGPT-made Calgary illustration served as this page's background earlier on 2026-09-13 and was replaced by the photo above.
- Pexels photo banners for /scholarships/calgary/, /scholarships/alberta/ and /scholarships/national/ were added and removed on 2026-09-13.

None of the removed images remain in the repository's current tree.
