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
just build      # Generate Unicode data from ucd-full
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

- Use vanilla HTML, CSS, and JavaScript. Do not add a frontend framework, bundler, transpiler, or runtime dependency.
- Keep browser code as ES modules, with `src/script.js` as the only HTML entry point.
- Put feature code in focused modules under `src/`.
- Use `async/await` for data loading
- Debounce user input handlers.
- Keep `src/index.html` as semantic single-page application markup.
- Use CSS custom properties for all colours
- Keep Catppuccin Mocha colour variables in `:root`.
- Do not add a CSS preprocessor.

## Architecture Notes

- `build-unicode-data.js` reads from `ucd-full`, filters characters, groups them, writes JSON, and reports stats.
- Keep the build script as named CommonJS pipeline functions for loading, filtering, grouping, writing, and reporting data.
- Keep command-line behaviour in `main()`.
- Generated data files are `src/unicode-data.min.json` and `src/unicode-data.json`. Do not edit those files by hand.
- Character selection includes mathematical, currency, modifier, punctuation, and priority symbol blocks.
- Keep filters that exclude control characters, private-use areas, and non-printable glyphs.

## Deployment

- Cloudflare Pages build command: `npm run build`
- Cloudflare Pages output directory: `src`
- Keep the app static. Do not add server-side code.
- `.github/workflows/deploy-pages.yml` is the shared deploy workflow
- Keep `preview.yml` and `production.yml` as thin callers of `deploy-pages.yml`.
- `preview.yml` deploys same-repository pull requests and comments with the preview URL.
- `production.yml` deploys stable SemVer tags from `main`
- Required repository secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

## Security and Secrets

- Never commit Cloudflare credentials or generated secret material.
