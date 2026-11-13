#!/usr/bin/env bash
# ==============================================================================
# Monk's Dream Jazz Bar POS — Auto Sync Knowledge & Architecture Guard
# Synchronizes Graphify knowledge graph and checks documentation alignment.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "$ROOT_DIR"

# Ensure graphify executable is discoverable even in non-interactive/subagent shells
if ! command -v graphify &> /dev/null && [ -x "$HOME/.local/bin/graphify" ]; then
  export PATH="$HOME/.local/bin:$PATH"
fi

if command -v graphify &> /dev/null; then
  echo "⚡ Updating Graphify AST graph..."
  graphify update . --quiet 2>/dev/null || graphify update .
  echo "🌳 Updating Graphify collapsible tree..."
  if [ -f "graphify-out/graph.json" ]; then
    graphify tree --output graphify-out/GRAPH_TREE.html
  else
    echo "⚠️ graphify-out/graph.json not found; skipping tree generation."
  fi
  echo "✅ Graphify synced."
else
  echo "ℹ️ Graphify CLI not in PATH, skipping automatic graph update."
fi

exit 0
