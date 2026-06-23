# Glyph Party recipes
# Beautiful Unicode Character Search

# List recipes
list:
    @just --list

# Install dependencies
install:
    npm install

# Build Unicode data
build:
    npm run build:data

# Generate descriptions for glyphs using Gemini API
generate-descriptions:
    @echo "🤖 Generating glyph descriptions..."
    @if ! command -v uv >/dev/null 2>&1; then echo "❌ uv not found. Install it from: https://docs.astral.sh/uv/getting-started/installation/"; exit 1; fi
    uv run generate_descriptions.py

# Show the current project version
version:
    #!/usr/bin/env node
    const fs = require("fs");
    const path = require("path");

    const readJson = (filePath) => JSON.parse(fs.readFileSync(path.join(process.cwd(), filePath), "utf8"));

    const pkg = readJson("package.json");
    const lock = readJson("package-lock.json");
    const pyproject = fs.readFileSync(path.join(process.cwd(), "pyproject.toml"), "utf8");
    const uvLock = fs.readFileSync(path.join(process.cwd(), "uv.lock"), "utf8");
    const pyVersion = pyproject.match(/^version = "([^"]+)"$/m)?.[1];
    const uvVersion = uvLock.match(/\[\[package\]\]\nname = "glyph-party"\nversion = "([^"]+)"/)?.[1];

    const versions = [
      ["package.json", pkg.version],
      ["package-lock.json", lock.version],
      ['package-lock.json packages[""]', lock.packages?.[""]?.version],
      ["pyproject.toml", pyVersion],
      ["uv.lock glyph-party", uvVersion],
    ];

    let failed = false;
    for (const [source, value] of versions) {
      if (!value) {
        console.error(`${source}: missing version`);
        failed = true;
      } else {
        console.log(`${source}: ${value}`);
      }
    }

    const expected = pkg.version;
    for (const [source, value] of versions) {
      if (value && value !== expected) {
        console.error(`${source}: expected ${expected}, found ${value}`);
        failed = true;
      }
    }

    if (failed) {
      process.exit(1);
    }
    console.log(`current: ${expected}`);

# Update the project version
version-bump $version:
    #!/usr/bin/env bash
    set -euo pipefail
    version_pattern='^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$'
    if [[ ! "$version" =~ $version_pattern ]]; then
        echo "Invalid version: $version" >&2
        echo "Use a SemVer release version, for example 1.2.3." >&2
        exit 1
    fi
    npm version --no-git-tag-version "$version"
    node - "$version" <<'NODE'
    const fs = require("fs");
    const nextVersion = process.argv[2];
    const pyprojectPath = "pyproject.toml";
    const pyproject = fs.readFileSync(pyprojectPath, "utf8");
    if (!/^version = "([^"]+)"$/m.test(pyproject)) {
      console.error("pyproject.toml is missing a project version.");
      process.exit(1);
    }
    fs.writeFileSync(
      pyprojectPath,
      pyproject.replace(/^version = "([^"]+)"$/m, `version = "${nextVersion}"`),
    );
    NODE
    uv lock
    echo "Updated version to $version"

# Clean generated data files
clean:
    npm run clean

# Full rebuild - clean and build fresh data
rebuild: clean build

# Start development server
serve:
    @echo "🚀 Starting Glyph Party development server..."
    npm run dev

# Open browser to the application
open:
    #!/usr/bin/env bash
    echo "🌐 Opening Glyph Party in browser..."
    if [[ "$OSTYPE" == "darwin"* ]]; then open http://localhost:8000; elif [[ "$OSTYPE" == "linux-gnu"* ]]; then xdg-open http://localhost:8000; else echo "Please open http://localhost:8000 in your browser"; fi

# Start server and open browser in one command
dev: open serve

# Complete setup for new development environment
setup: install build
    @echo "🎉 Glyph Party setup complete!"
    @echo "Run 'just dev' to start developing"

# Deploy preparation - build optimized version
deploy-prep: rebuild
    @echo "📦 Glyph Party ready for deployment!"
    @echo "Generated files:"
    @ls -lh src/*.json | awk '{print "  " $9 " (" $5 ")"}'

# Show project statistics
stats:
    #!/usr/bin/env bash
    echo "📊 Glyph Party Statistics:"
    echo "================================"
    if [ -f "src/unicode-data.min.json" ]; then
        echo "Unicode data loaded ✅"
        node -e "const data = require('./src/unicode-data.min.json'); console.log('Characters: ' + data.stats.totalCharacters.toLocaleString()); console.log('Categories: ' + data.stats.categories); console.log('Unicode Version: ' + data.stats.unicodeVersion)"
    else
        echo "Unicode data not built ❌"
        echo "Run 'just build' to generate data"
    fi
    echo ""
    echo "Files:"
    find src \( -name "*.html" -o -name "*.css" -o -name "*.js" -o -name "*.json" \) | sort | while read file; do
        if [ -f "$file" ]; then
            size=$(ls -lh "$file" | awk '{print $5}')
            echo "  $file ($size)"
        fi
    done

# Check if all required files exist
check:
    @echo "🔍 Checking Glyph Party setup..."
    @echo "================================"
    @echo "Files:"
    @if [ -f "src/index.html" ]; then echo "✅ src/index.html"; else echo "❌ src/index.html (missing)"; fi
    @if [ -f "src/style.css" ]; then echo "✅ src/style.css"; else echo "❌ src/style.css (missing)"; fi
    @if [ -f "src/script.js" ]; then echo "✅ src/script.js"; else echo "❌ src/script.js (missing)"; fi
    @if [ -f "build-unicode-data.js" ]; then echo "✅ build-unicode-data.js"; else echo "❌ build-unicode-data.js (missing)"; fi
    @if [ -f "package.json" ]; then echo "✅ package.json"; else echo "❌ package.json (missing)"; fi
    @echo ""
    @if [ -f "src/unicode-data.min.json" ]; then echo "✅ Unicode data built"; else echo "⚠️  Unicode data not built (run 'just build')"; fi
    @if [ -f "descriptions.json" ]; then echo "✅ Glyph descriptions generated"; else echo "⚠️  Glyph descriptions not generated (run 'just generate-descriptions')"; fi
    @echo ""
    @if command -v node >/dev/null 2>&1; then echo "✅ Node.js available ($(node --version))"; else echo "❌ Node.js not found"; fi
    @if command -v python3 >/dev/null 2>&1; then echo "✅ Python available ($(python3 --version 2>&1))"; else echo "❌ Python not found"; fi
    @if command -v uv >/dev/null 2>&1; then echo "✅ uv available ($(uv --version))"; else echo "⚠️  uv not found (needed for 'just generate-descriptions')"; fi

# Quick development cycle - rebuild and serve
quick: rebuild dev

# Show help for common commands
help:
    @just --list

# Run development server in watch mode (if you have watchexec installed)
watch:
    @echo "👀 Starting Glyph Party with file watching..."
    @if command -v watchexec >/dev/null 2>&1; then \
        watchexec -w src -i "*.json" -- echo "Files changed, browser should auto-reload"; \
    else \
        echo "❌ watchexec not found. Install with: cargo install watchexec-cli"; \
        echo "📝 Falling back to regular serve mode..."; \
        just serve; \
    fi
