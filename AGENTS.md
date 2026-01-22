# AGENTS.md

Glyph Party is a static web application for searching Unicode characters, targeting terminal/CLI developers who want visual flair without NerdFonts.

## Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript (no framework, no bundler)
- **Build:** Node.js with `ucd-full` package for Unicode data extraction
- **Dev server:** Python 3 `http.server`
- **Theme:** Catppuccin Mocha colour palette
- **Task runner:** just

## Project Structure

```
glyph-party/
├── src/                    # Deployable static assets
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── unicode-data.min.json  # Generated - do not edit
├── build-unicode-data.js   # Extracts glyphs from UCD
├── justfile
└── package.json
```

## Setup Commands

```bash
just setup      # Install deps + build Unicode data
just check      # Verify setup is correct
```

## Build Commands

```bash
just build      # Generate Unicode data from ucd-full
just rebuild    # Clean + build fresh
just clean      # Remove generated JSON files
```

## Development Commands

```bash
just dev        # Start server + open browser (localhost:8000)
just serve      # Start server only
just stats      # Show character/category statistics
```

## Code Style

### JavaScript

- ES6+ class-based architecture (see `GlyphParty` class)
- No transpilation - vanilla JS only
- Use `async/await` for data loading
- Debounce user input handlers

### CSS

- Catppuccin Mocha variables in `:root` (e.g. `--base`, `--text`, `--mauve`)
- Use CSS custom properties for all colours
- No CSS preprocessors

### HTML

- Single-page application in `src/index.html`
- Semantic HTML5 elements

## Architecture Notes

### Data Pipeline

1. `build-unicode-data.js` reads from `ucd-full` package
2. Filters characters by category (Sm, So, Ps, Pe, Pd, Po, Sc, Sk) and priority blocks
3. Outputs `src/unicode-data.min.json` (compact) and `src/unicode-data.json` (readable)

### Character Selection

The build script includes characters from:
- Mathematical/currency/modifier symbols
- Punctuation categories
- Priority blocks: Arrows, Box Drawing, Geometric Shapes, Dingbats, etc.

Characters are filtered to exclude control characters, private use areas, and non-printable glyphs.

## Deployment

Target platform: Cloudflare Pages

- Build command: `npm run build`
- Output directory: `src`
- No server-side code

## Constraints

- Node.js 16+ required
- Python 3 required for dev server
- Generated JSON files (`src/*.json`) should not be manually edited
- No external runtime dependencies - all assets are static

## PR Guidelines

- Run `just check` before committing
- Ensure `just build` succeeds if modifying the data pipeline
- Test in browser with `just dev`
