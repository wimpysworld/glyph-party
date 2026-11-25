# Glyph Party

Glyph Party is a static web application for searching Unicode characters, targeting terminal/CLI developers who want visual flair without NerdFonts.

## Setup

```bash
just setup      # Install dependencies and build Unicode data
just check      # Verify local setup
```

Use the runtime requirements from `package.json` and the `justfile`.

## Build and Test

```bash
just build      # Generate Unicode data from pinned official sources
just rebuild    # Clean + build fresh
just clean      # Remove generated Unicode data files
```

## Development Commands

```bash
just dev        # Start server + open browser (localhost:8000)
just serve      # Start server only
just stats      # Show character/category statistics
```

Run `just check` before committing. Run `just build` when changing the data pipeline. Test UI changes in a browser with `just dev`.

## Code Style

- Use vanilla HTML and JavaScript with Digicreon µCSS. Do not add a JavaScript framework, bundler, transpiler, or runtime dependency.
- Do not add µJS.
- Keep browser code as ES modules, with `pages/script.js` as the only HTML entry point.
- Put feature code in focused modules under `pages/`.
- Use `async/await` for data loading
- Debounce user input handlers.
- Keep `pages/index.html` as semantic single-page application markup.
- Use CSS custom properties for all project colours.
- Use the pinned Digicreon µCSS Violet stylesheet, followed by the project stylesheet.
- Keep project custom properties and overrides in the project stylesheet.
- Do not add a CSS preprocessor.

## Architecture Notes

- Pin official `UnicodeData.txt` and `Blocks.txt` sources in `ucd-sources.json`. Load them through `ucd-data.js` for `build-unicode-data.js`.
- Verify source checksums against the source manifest before use, including cached files in `.cache/ucd/<version>`.
- Keep the build script as named CommonJS pipeline functions for loading, filtering, grouping, writing, and reporting data.
- Keep command-line behaviour in `main()`.
- Generated data files are `pages/unicode-data.min.json` and `pages/unicode-data.json`. Do not edit those files by hand.
- Keep the `v` prefix on Git tags only. Etch bare versions into generated data via `BUILD_VERSION`, `git describe --tags --match 'v*.*.*' --always --dirty`, or `package.json`.
- Character selection includes mathematical, currency, modifier, punctuation, and priority symbol blocks.
- Keep filters that exclude control characters, private-use areas, and non-printable glyphs.

## Deployment

- Build command: `npm run build`
- Static output directory: `pages`
- Keep the app static. Do not add server-side code.
- `.github/workflows/deploy-pages.yml` builds `pages/`, deploys to GitHub Pages on stable SemVer tags (`v*.*.*`) and `workflow_dispatch`, and creates a GitHub Release after tag deploys succeed.
- Keep `pages.enabled: false` in `.tailor.yml` so Tailor does not overwrite custom `pages/` app files or skip the Unicode data build.
- Custom domain `glyph-party.wimpys.world` points to `wimpysworld.github.io` via Cloudflare DNS (DNS Only).

## Security and Secrets

- Never commit credentials or generated secret material.
