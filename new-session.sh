#!/usr/bin/env bash
# Start a fresh Claude Code session for UnionVault, resuming from the handoff doc.
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_DIR"

if ! command -v claude &>/dev/null; then
  echo "claude CLI not found. Install it from https://claude.ai/code or run 'npm i -g @anthropic-ai/claude-code'" >&2
  exit 1
fi

exec claude "Read HANDOFF_SESSION9.md then resume from Step 1 of the Immediate Action Plan without asking any questions."
