# Managed by Tailor: just/og.just

# Generate the Open Graph social preview image (pass --force to overwrite)
[positional-arguments]
og *args:
    #!/usr/bin/env bash
    set -euo pipefail
    if ! command -v tailor-og >/dev/null 2>&1; then
        echo "Error: tailor-og is not on PATH. Likely causes:" >&2
        echo "  1. The Nix dev shell failed to build. Run nix develop to see the error, for example a stale flake input fixed by nix flake update <input>." >&2
        echo "  2. direnv uses an old or missing cache. Run nix-direnv-reload." >&2
        echo "  3. nix/og.nix or another Nix file is not added to Git, and flakes ignore untracked files. Run git add on it." >&2
        exit 1
    fi
    args=(
        --output 'pages/og.png'
        --theme 'dark'
        --style-css 'pages/style.css'
        --title 'Glyph Party'
        --tagline 'Finally, a Unicode search tool that sparks joy instead of despair. 10,000+ characters, zero tears'
        --footer 'glyph-party.wimpys.world'
    )
    exec tailor-og ${args[@]+"${args[@]}"} "$@"
