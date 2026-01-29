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

# Clean generated data files
clean:
    npm run clean

# Full rebuild - clean and build fresh data
rebuild: clean build

# Start development server
serve:
    @echo "🚀 Starting Glyph Party development server..."
    cd src && python3 -m http.server 8000

# Open browser to the application
open:
    #!/usr/bin/env bash
    echo "🌐 Opening Glyph Party in browser..."
    if [[ "$OSTYPE" == "darwin"* ]]; then open http://localhost:8000; elif [[ "$OSTYPE" == "linux-gnu"* ]]; then xdg-open http://localhost:8000; else echo "Please open http://localhost:8000 in your browser"; fi

# Start server and open browser in one command
dev:
    #!/usr/bin/env bash
    echo "✨ Starting Glyph Party development environment..."
    echo "🌐 Opening browser..."
    if [[ "$OSTYPE" == "darwin"* ]]; then open http://localhost:8000 2>/dev/null || true; elif [[ "$OSTYPE" == "linux-gnu"* ]]; then xdg-open http://localhost:8000 2>/dev/null || true; else echo "Please open http://localhost:8000 in your browser"; fi
    echo "🚀 Starting server..."
    cd src && python3 -m http.server 8000

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
    @echo "🎉 Glyph Party - Just Commands"
    @echo "============================="
    @echo ""
    @echo "🚀 Getting started:"
    @echo "  just setup                  # Complete setup for new environment"
    @echo "  just dev                    # Start development server + open browser"
    @echo ""
    @echo "🔧 Development:"
    @echo "  just build                  # Generate Unicode data"
    @echo "  just generate-descriptions  # Generate glyph descriptions"
    @echo "  just serve                  # Start development server"
    @echo "  just open                   # Open browser to app"
    @echo "  just quick                  # Rebuild + serve + open"
    @echo ""
    @echo "📊 Information:"
    @echo "  just stats                  # Show project statistics"
    @echo "  just check                  # Verify setup"
    @echo ""
    @echo "🧹 Maintenance:"
    @echo "  just clean                  # Remove generated files"
    @echo "  just rebuild                # Clean + build fresh"
    @echo ""
    @echo "🌐 The Unicode data contains 10,000+ beautiful characters"
    @echo "   perfect for adding visual flair to terminal applications!"

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
