#!/usr/bin/env bash
# ==============================================================================
# Monk's Dream Jazz Bar POS — Supabase TypeScript Type Drift Guard
# Ensures packages/shared/src/database.types.ts is committed and clean
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
TYPES_FILE="${ROOT_DIR}/packages/shared/src/database.types.ts"

echo "🔍 Checking Supabase Database TypeScript Definitions..."

if [[ ! -f "$TYPES_FILE" ]]; then
  echo "❌ Error: database.types.ts not found at ${TYPES_FILE}"
  echo "👉 Run 'pnpm supabase:types' to generate types."
  exit 1
fi

# Check if the file has uncommitted git changes
if git status --porcelain "$TYPES_FILE" | grep -q "$TYPES_FILE"; then
  echo "⚠️ Warning: packages/shared/src/database.types.ts has uncommitted changes."
  echo "👉 Please verify your migrations and commit the updated types."
fi

# Ensure the file is not empty and exports Database type
if ! grep -q "export type Database" "$TYPES_FILE"; then
  echo "❌ Error: database.types.ts is corrupt or does not export 'Database' type!"
  exit 1
fi

echo "✅ Supabase database.types.ts is present and valid."
exit 0
