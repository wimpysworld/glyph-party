#!/usr/bin/env bash
set -euo pipefail

npm test
uv run --locked python -m unittest discover -s test -p 'test_*.py'
