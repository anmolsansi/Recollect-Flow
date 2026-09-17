# BG-05 — Web Production Artifact Evidence

Verification candidate: `3179b1d1601142d8d071285d06aa3630e3f0742c`

Source: GitHub Actions CI run #150 on the exact candidate.

`npm run web:build` completed successfully as part of `npm run check`.

Build tool: Vite `8.2.0`.

Recorded production outputs:

- `dist/index.html` — 0.45 kB, gzip 0.29 kB
- `dist/assets/index--UVWKVvu.css` — 3.74 kB, gzip 1.34 kB
- `dist/assets/index-CuFr4vVv.js` — 245.17 kB, gzip 77.83 kB

Vite transformed 26 modules and completed the production build successfully. This proves buildability of the Web artifact on the candidate. It does not prove production Web hosting, routing, physical-device acceptance or deployment, which remain later acceptance work.
