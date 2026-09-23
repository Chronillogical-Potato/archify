# Cookie offline policy — archify

Fleet fork of tt-a1i/archify for Chronillogical-Potato / Cookie Monster.

## Hard policy

- `ARCHIFY_UPDATE_CHECK_DISABLED=1` on every host (see `COOKIE.env.md`). Agents must **not** run `scripts/check-update.mjs`.
- **Forbid unpinned remote brand capture.** Bundled brand catalog only. Never set `ARCHIFY_BRAND_ALLOW_PRIVATE=1` unless Shem explicitly opts in.
- Fonts: only the three Cookie families (see below). No Google Fonts CDN. JetBrains Mono removed from viewer templates.

## Fonts

Copied under `archify/assets/fonts/` (+ sha256 in `archify/assets/fonts.sha256`, policy in `archify/assets/MANIFEST.json`).

| File | CSS family | Use |
|------|------------|-----|
| `FiraCodeNerdFontPropo-Retina.ttf` (+ `.woff2`) | `Fira Code Nerd Font Propo` | UI / reading |
| `FiraCodeNerdFontMono-Retina.ttf` (+ `.woff2`) | `Fira Code Nerd Font Mono` | Grid / diagram mono |
| `GeistPixel-Line.otf` (+ `.woff2`) | `Geist Pixel Line` | Titles / headers only (own HTML container) |

Viewer `template.html` / `viewer/template.source.html` embed WOFF2 as data-URLs and also reference `./fonts/` for non-embedded serving.

Shared pointer: fleet `/workspace/cookie-viz-assets/MANIFEST.json`.
