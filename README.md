# ✨ Glyph Party

> *Beautiful Unicode Character Search*

A drop-dead gorgeous [Unicode character search](https://glyph-party.wimpys.world/) tool for developers who want to add visual flair to their CLI applications, because your terminal deserves better than boring ASCII. Built with love, powered by cups of tea, and themed with [Catppuccin](https://catppuccin.com) colours 🎨 that'll make your eyes happy.

**🌐 [Try it live at glyph-party.wimpys.world](https://glyph-party.wimpys.world/)**

## 🎭 The Story

Tired of hunting through nightmarish Unicode search websites that look like they were designed in 1995? So was I. After spending way too long trying to find the perfect symbols for a terminal app, I decided enough was enough 👿

**Glyph Party** is what happens when a developer gets fed up with ugly interfaces tuat are awkward to use and decides to build something better instead. It's Unicode search, but ✨*pretty*✨ and easy to use.

## 🚀 What You Get

- **10,000+ carefully curated glyphs** perfect for terminal UIs, no [NerdFonts](https://www.nerdfonts.com/) required
- **AI-generated descriptions** for each glyph to help make the search easier
- **Instant search** that actually works (shocking, I know)
- **Click to copy** any character (because life's too short for manual selection)
- **Catppuccin Mocha theme** that won't burn your retinas
- **Categories & blocks** for when you know roughly what you want
- **Click for details** including Unicode codes and HTML entities
- **Responsive design** that works on your phone too

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

## 🛠️ Just Commands

Using [just](https://github.com/casey/just) because Makefiles are so last decade:

```bash
just setup                  # Complete setup for new projects
just dev                    # Start development server + open browser
just build                  # Generate fresh Unicode data
just generate-descriptions  # Generate AI descriptions for glyphs
just stats                  # Show project statistics
just check                  # Verify everything's working
just help                   # When you forget these commands
```

## 🚀 Deployment

Designed for [Cloudflare Pages](https://pages.cloudflare.com) but works anywhere static sites are welcome:

1. Push to GitHub
2. Connect to Cloudflare Pages
3. Set build command: `npm run build`
4. Set output directory: `src`
5. Marvel at your creation

## 🎯 Perfect For

- CLI tools that need visual flair
- Terminal UIs with personality
- Documentation that doesn't suck
- Any project that deserves better than `*` and `-`

## 📊 Stats

- **10,616** hand-picked characters
- **22** categories of awesome
- **199** Unicode blocks

## 🤝 Contributing

Found a bug? Want to add features? Think the colour scheme needs more purple? PRs welcome!

---

*Made in 🏴󠁧󠁢󠁥󠁮󠁧󠁿 while listening to [Linux Matters](https://linuxmatters.sh) 🐧🎙️*
