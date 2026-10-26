#!/usr/bin/env bash
# Start a fresh Claude Code session for UnionVault, resuming from the latest handoff doc.
set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

if ! command -v claude &>/dev/null; then
  echo "claude CLI not found. Install it from https://claude.ai/code or run 'npm i -g @anthropic-ai/claude-code'" >&2
  exit 1
fi

LATEST="$(ls docs/sessions/HANDOFF_SESSION*.md | sort -V | tail -1)"
exec claude "Read $LATEST then resume from the Immediate Action Plan without asking any questions."
