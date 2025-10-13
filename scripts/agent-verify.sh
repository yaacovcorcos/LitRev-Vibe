#!/usr/bin/env bash

# Automated guardrail script for AI operators.
# Runs formatting, linting, tests, and Storybook checks when available.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Early exit when the Node workspace has not been bootstrapped yet.
if [[ ! -f "package.json" ]]; then
  echo "agent-verify: package.json not found; skipping Node verification steps for now."
  exit 0
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "agent-verify: pnpm is required but not installed. Please install pnpm to continue." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "agent-verify: Node.js is required but not installed. Please install Node.js to continue." >&2
  exit 1
fi

has_script() {
  local script_name="$1"
  local value

  value="$(pnpm pkg get "scripts.${script_name}" 2>/dev/null | tr -d '\"' | tr -d '\n' | tr -d '\r')"
  if [[ -z "$value" || "$value" == "null" ]]; then
    return 1
  fi

  return 0
}

run_script_if_present() {
  local script_name="$1"
  shift || true

  if ! has_script "$script_name"; then
    echo "agent-verify: skipping \"${script_name}\" (not defined in package.json)."
    return 0
  fi

  echo "agent-verify: running \"pnpm run ${script_name}\"..."
  pnpm run "${script_name}" "$@"
}

run_script_if_present "format:check"
run_script_if_present "lint"
run_script_if_present "test" "--" "--runInBand"
run_script_if_present "storybook:test"

echo "agent-verify: verification complete."
