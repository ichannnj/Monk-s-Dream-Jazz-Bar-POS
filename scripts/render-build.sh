#!/usr/bin/env bash
set -euo pipefail

echo "=========================================="
echo "🎷 Monk's Dream Jazz Bar POS — Render Build"
echo "=========================================="

# 1. Ensure pnpm is available
if ! command -v pnpm &> /dev/null; then
  echo "📦 pnpm not detected in PATH. Enabling via corepack / npm..."
  corepack enable 2>/dev/null || npm install -g pnpm@latest
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
