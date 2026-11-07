#!/usr/bin/env bash
set -e

# Load credentials from frontend/.env
if [ -f frontend/.env ]; then
  export $(grep -E '^[A-Z0-9_]+=' frontend/.env | xargs)
fi

export SUPABASE_URL="${SUPABASE_URL:-$EXPO_PUBLIC_SUPABASE_URL}"
export SUPABASE_KEY="${SUPABASE_KEY:-$EXPO_PUBLIC_SUPABASE_KEY}"
export PRINTER_DEVICE="${PRINTER_DEVICE:-/dev/usb/lp0}"

echo "Starting Monk's Dream POS Background Hardware Printer Daemon..."
node packages/printing/dist/cli.js
