# ✨ Glyph Party

> *Beautiful Unicode Character Search*

A drop-dead gorgeous [Unicode character search](https://glyph-party.wimpys.world/) tool for developers who want to add visual flair to their CLI applications, because your terminal deserves better than boring ASCII. Built with love, powered by cups of tea, and themed with Digicreon µCSS Violet colours 🎨 that'll make your eyes happy.

**🌐 [Try it live at glyph-party.wimpys.world](https://glyph-party.wimpys.world/)**

## 🎭 The Story

Tired of hunting through nightmarish Unicode search websites that look like they were designed in 1995? So was I. After spending way too long trying to find the perfect symbols for a terminal app, I decided enough was enough 👿

**Glyph Party** is what happens when a developer gets fed up with ugly interfaces tuat are awkward to use and decides to build something better instead. It's Unicode search, but ✨*pretty*✨ and easy to use.

## 🚀 What You Get

- **10,000+ carefully curated glyphs** perfect for terminal UIs, no [NerdFonts](https://www.nerdfonts.com/) required
- **AI-generated descriptions** for all 10,868 glyphs to help with search.
- **Instant search** that actually works (shocking, I know)
- **Optional Noto Sans Symbols 2 preview** lets you compare glyphs with a reference font. Local browser fonts are the default, and Noto loads only when you select it. Copying a character does not include a font, so your terminal can look different.
- **Click to copy** any character (because life's too short for manual selection)
- **Digicreon µCSS Violet theme** with light and dark modes that won't burn your retinas
- **Categories & blocks** for when you know roughly what you want
- **Click for details** including Unicode codes and HTML entities
- **Responsive design** that works on your phone too

### Optional reference font

The optional preview loads [Noto Sans Symbols 2 v25](https://fonts.gstatic.com/s/notosanssymbols2/v25/I_uyMoGduATTei9eI8daxVHDyfisHr71ypY.woff2) from Google's content delivery network. The font uses the [SIL Open Font License 1.1](https://raw.githubusercontent.com/google/fonts/main/ofl/notosanssymbols2/OFL.txt).

Selecting Noto requires a network connection and contacts Google. Local browser fonts are the default, with no reference font request until you select Noto. If the font cannot load, the preview returns to local fonts. Glyph Party does not bundle the font.

## ⚡ Quick Start

### The Lazy Way (Recommended) 💪

```bash
git clone https://github.com/wimpysworld/glyph-party.git
cd glyph-party
just setup    # Installs deps + builds Unicode data
just dev      # Starts server + opens browser
```

### The Manual Way 🤦‍♂️

```bash
npm install
npm run build:data
npm run dev
```

**Requirements:** Node.js 16+, Python 3, and a sense of style.

> [!TIP]
> The browser code uses ES modules. Serve the site over HTTP, for example with `just dev`, instead of opening `src/index.html` from disk.

### Unicode data sources

The build downloads the official Unicode 18.0.0 `UnicodeData.txt` and `Blocks.txt` files. `ucd-sources.json` pins their URLs and SHA-256 checksums.
The first build requires HTTPS access to `www.unicode.org`. Later builds use `.cache/ucd/18.0.0/` and verify both checksums on every build.
`just clean` removes generated JSON files but retains this source cache. A build with a complete, verified cache needs no network connection.

Failed downloads, checksum mismatches, and invalid data cause the build to fail. If a cached file fails verification, move that file out of the cache and rebuild.
The build uses Node.js built-ins and does not require `ucd-full`. The generated app remains static and makes no Unicode source requests.

Run `npm test` after a build to check the parser, source verification, and generated data. `just check` also runs these checks.

> [!NOTE]
> To generate descriptions for glyphs using AI, you'll need a Google Gemini API key and `uv` installed. You can install `uv` with this command:
>
> ```bash
> curl -LsSf https://astral.sh/uv/install.sh | sh
> ```
>
> Now, create a `.env` file in the project root with your API key. Copy the provided `.env.example` file as a starting point:
>
> ```bash
> cp .env.example .env
> ```
>
> Then, add your Gemini API key to the `.env` file. After that, you can run:
>
> ```bash
> just generate-descriptions
> ```

The generator uses Gemini 3.8 Flash with low thinking. It accepts `GEMINI_API_KEY` or the existing `GOOGLE_API_KEY` variable.
By default, it generates only missing or blank descriptions. Each request contains up to 25 glyphs, with up to five requests in parallel.
Each validated batch is saved atomically. If a request fails, run the same command again to fill the remaining gaps.
Run `just build` after generation to include the descriptions in the app.

Use `just generate-descriptions --rebuild` to regenerate all selected descriptions. This makes paid requests for every glyph and replaces existing descriptions.
If a rebuild fails, completed batches remain saved. Repeating `--rebuild` regenerates every glyph again.
Run `just test-descriptions` to check validation, failed saves, and resume behaviour without API requests.

## 🛠️ Just Commands

Using [just](https://github.com/casey/just) because Makefiles are so last decade:

```bash
just setup                  # Complete setup for new projects
just dev                    # Start development server + open browser
just serve                  # Start development server only
just build                  # Generate fresh Unicode data
just clean                  # Remove generated Unicode data files
just rebuild                # Clean + build fresh data
just generate-descriptions  # Generate AI descriptions for glyphs
just stats                  # Show project statistics
just check                  # Verify everything's working
just help                   # List every recipe
```

## 🚀 Deployment

Designed for [Cloudflare Pages](https://pages.cloudflare.com) but works anywhere static sites are welcome.

GitHub Actions deploys the site with the reusable `.github/workflows/deploy-pages.yml` workflow:

- Pull requests from this repository deploy a preview and add the preview URL as a PR comment.
- Stable SemVer tags, such as `1.2.3`, deploy production from `main`.
- The workflows expect `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets.

For a manual Cloudflare Pages setup, use:

- Build command: `npm run build`
- Output directory: `src`

## 🎯 Perfect For

- CLI tools that need visual flair
- Terminal UIs with personality
- Documentation that doesn't suck
- Any project that deserves better than `*` and `-`

## 📊 Stats

- **10,868** selected characters from Unicode 18.0.0
- **22** categories
- **203** Unicode blocks

## 🤝 Contributing

Found a bug? Want to add features? Think the colour scheme needs more purple? PRs welcome!

---

*Made in 🏴󠁧󠁢󠁥󠁮󠁧󠁿 while listening to [Linux Matters](https://linuxmatters.sh) 🐧🎙️*
