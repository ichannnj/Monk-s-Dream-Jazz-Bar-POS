#!/usr/bin/env bash
set -euo pipefail

echo "=========================================="
echo "🎷 Monk's Dream Jazz Bar POS — Render Build"
echo "=========================================="

# 1. Ensure exact pinned pnpm version matching package.json#packageManager
EXPECTED_PNPM="12.11.2"
CURRENT_PNPM="$(pnpm -v 2>/dev/null || echo "")"
if [ "$CURRENT_PNPM" != "$EXPECTED_PNPM" ]; then
  echo "📦 Installing pnpm@${EXPECTED_PNPM} into /tmp/pnpm-bin (found: ${CURRENT_PNPM:-none})..."
  npm install --no-save --no-audit --no-fund --prefix /tmp/pnpm-bin "pnpm@${EXPECTED_PNPM}"
  export PATH="/tmp/pnpm-bin/node_modules/.bin:${PATH}"
fi

echo "📍 Using Node: $(node -v)"
echo "📍 Using pnpm: $(pnpm -v)"

# 2. Install workspace dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# 3. Build shared library and web bundle
echo "🔨 Running build..."
pnpm build

echo "=========================================="
echo "✅ Build complete! Publish directory: frontend/dist"
echo "=========================================="
