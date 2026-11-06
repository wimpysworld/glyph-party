#!/usr/bin/env bash
set -euo pipefail

case "${1:-check}" in
    check|correct) ;;
    *) echo "Error: lint mode must be check or correct" >&2; exit 1 ;;
esac

just version
for source in ./*.js test/*.js; do
    node --check "${source}"
done
for source in src/*.js; do
    node --input-type=module --check < "${source}"
done
python3 - <<'PY'
import ast
from pathlib import Path

for source in [*Path('.').glob('*.py'), *Path('test').glob('*.py')]:
    ast.parse(source.read_text(encoding='utf-8'), filename=str(source))
PY
for source in just/project/*.sh; do
    bash -n "${source}"
done
