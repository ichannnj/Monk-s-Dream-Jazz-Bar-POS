#!/usr/bin/env bash
# ==============================================================================
# Monk's Dream Jazz Bar POS — Auto Sync Knowledge & Architecture Guard
# Synchronizes Graphify knowledge graph and checks documentation alignment.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "$ROOT_DIR"

if command -v graphify &> /dev/null; then
  echo "⚡ Updating Graphify AST graph..."
  graphify update . --quiet 2>/dev/null || graphify update .
  echo "🌳 Updating Graphify collapsible tree..."
  graphify tree --output graphify-out/GRAPH_TREE.html 2>/dev/null || true
  echo "✅ Graphify synced."
else
  echo "ℹ️ Graphify CLI not in PATH, skipping automatic graph update."
fi

exit 0
