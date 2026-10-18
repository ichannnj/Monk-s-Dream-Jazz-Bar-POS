#!/usr/bin/env bash
# ==============================================================================
# Monk's Dream Jazz Bar POS — SQL Migration Linter & Safety Guardrail
# Invariants:
# 1. Every CREATE TABLE must have a matching ALTER TABLE ... ENABLE ROW LEVEL SECURITY
# 2. Every SECURITY DEFINER function must explicitly SET search_path
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
MIGRATIONS_DIR="${ROOT_DIR}/supabase/migrations"

echo "🔍 Running Supabase SQL Migration Linter on: ${MIGRATIONS_DIR}"

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "❌ Error: Migrations directory not found at $MIGRATIONS_DIR"
  exit 1
fi

FAILURES=0

for sql_file in "$MIGRATIONS_DIR"/*.sql; do
  [[ -f "$sql_file" ]] || continue
  filename=$(basename "$sql_file")
  echo "  Checking ${filename}..."

  # 1. Extract created table names (ignoring temporary/case differences)
  # Looks for: CREATE TABLE [IF NOT EXISTS] [public.]table_name (
  tables=$(grep -iE 'CREATE[[:space:]]+TABLE[[:space:]]+(IF[[:space:]]+NOT[[:space:]]+EXISTS[[:space:]]+)?([a-zA-Z0-9_]+\.)?([a-zA-Z0-9_]+)' "$sql_file" \
    | sed -E 's/.*CREATE[[:space:]]+TABLE[[:space:]]+(IF[[:space:]]+NOT[[:space:]]+EXISTS[[:space:]]+)?([a-zA-Z0-9_]+\.)?([a-zA-Z0-9_]+).*/\3/I' \
    | tr '[:upper:]' '[:lower:]' || true)

  for table in $tables; do
    [[ -z "$table" ]] && continue
    # Verify ALTER TABLE ... ENABLE ROW LEVEL SECURITY exists for this table
    if ! grep -qiE "ALTER[[:space:]]+TABLE[[:space:]]+(public\.)?${table}[[:space:]]+ENABLE[[:space:]]+ROW[[:space:]]+LEVEL[[:space:]]+SECURITY" "$sql_file"; then
      echo "    ❌ [RLS Violation] Table '${table}' does not have Row Level Security enabled in ${filename}!"
      FAILURES=$((FAILURES + 1))
    else
      echo "    ✅ Table '${table}' has RLS enabled."
    fi
  done

  # 2. Check SECURITY DEFINER functions for explicit search_path
  # Functions that define SECURITY DEFINER must have SET search_path to prevent hijacking
  if grep -qi "SECURITY[[:space:]]\+DEFINER" "$sql_file"; then
    if ! grep -qi "search_path" "$sql_file"; then
      echo "    ❌ [Security Definer Violation] File ${filename} contains SECURITY DEFINER function(s) without SET search_path!"
      FAILURES=$((FAILURES + 1))
    else
      echo "    ✅ SECURITY DEFINER functions declare search_path."
    fi
  fi
done

echo "--------------------------------------------------------"
if [[ $FAILURES -gt 0 ]]; then
  echo "❌ Migration Lint Failed: ${FAILURES} violation(s) found in migrations."
  exit 1
else
  echo "✅ All SQL migrations pass security and RLS guardrails!"
  exit 0
fi
