#!/usr/bin/env bash
#
# Setup Local Supabase Development Environment for Monk's Dream Jazz Bar POS.
# Ensures Docker is active, starts local Supabase stack, backs up cloud credentials,
# and configures the frontend to talk to local Postgres/Realtime.
#

set -euo pipefail

BOLD=$(tput bold 2>/dev/null || echo "")
DIM=$(tput dim 2>/dev/null || echo "")
RESET=$(tput sgr0 2>/dev/null || echo "")
BLUE=$(tput setaf 4 2>/dev/null || echo "")
GREEN=$(tput setaf 2 2>/dev/null || echo "")
YELLOW=$(tput setaf 3 2>/dev/null || echo "")
RED=$(tput setaf 1 2>/dev/null || echo "")

printf "\n%s%s🎷 Monk's Dream POS — Local Supabase Setup%s\n\n" "$BOLD" "$BLUE" "$RESET"

# 1. Check Docker Installation
if ! command -v docker >/dev/null 2>&1; then
  printf "%s[Error] Docker is not installed on this system.%s\n\n" "$RED" "$RESET"
  printf "On CachyOS / Arch Linux, install and start Docker by running:\n"
  printf "  %ssudo pacman -S --needed docker docker-compose%s\n" "$BOLD" "$RESET"
  printf "  %ssudo systemctl enable --now docker%s\n" "$BOLD" "$RESET"
  printf "  %ssudo usermod -aG docker \$USER%s\n\n" "$BOLD" "$RESET"
  printf "After running those commands, re-run this setup with:\n"
  printf "  %spnpm supabase:setup:local%s\n\n" "$GREEN" "$RESET"
  exit 1
fi

# 2. Check Docker Daemon Connectivity
if ! docker info >/dev/null 2>&1; then
  printf "%s[Warning] Docker daemon is not accessible.%s\n" "$YELLOW" "$RESET"
  printf "Ensure Docker service is running:\n"
  printf "  %ssudo systemctl start docker%s\n\n" "$BOLD" "$RESET"
  printf "If you just added your user to the docker group, refresh your group session with:\n"
  printf "  %snewgrp docker%s\n" "$BOLD" "$RESET"
  printf "Then run %spnpm supabase:setup:local%s again.\n\n" "$GREEN" "$RESET"
  exit 1
fi

printf "%s✔ Docker is installed and running.%s\n" "$GREEN" "$RESET"

# 3. Start Local Supabase
printf "\n%s▸ Starting local Supabase containers...%s\n" "$BLUE" "$RESET"
npx supabase start

# 4. Fetch Connection Status & Keys
printf "\n%s▸ Retrieving local Supabase keys...%s\n" "$BLUE" "$RESET"
STATUS_JSON=$(npx supabase status -o json 2>/dev/null || true)

API_URL="http://127.0.0.1:54321"
ANON_KEY=""

if [[ -n "$STATUS_JSON" ]] && command -v jq >/dev/null 2>&1; then
  API_URL=$(echo "$STATUS_JSON" | jq -r '.API_URL // "http://127.0.0.1:54321"')
  ANON_KEY=$(echo "$STATUS_JSON" | jq -r '.ANON_KEY // empty')
fi

# Fallback extraction if jq is absent
if [[ -z "$ANON_KEY" ]]; then
  ANON_KEY=$(npx supabase status 2>/dev/null | grep -i "anon key:" | awk '{print $3}' | tr -d '\r' || true)
fi

# Standard CLI default anon key fallback if still empty
if [[ -z "$ANON_KEY" ]]; then
  ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IjEyNy4wLjAuMSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjQ5Mzg3MjAwLCJleHAiOjE5NjQ5NjMyMDB9.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtbcMu_smJegb5Ec"
fi

# 5. Environment Backups & Generation
if [[ -f "frontend/.env" ]] && [[ ! -f "frontend/.env.cloud" ]]; then
  printf "%s▸ Backing up current frontend/.env to frontend/.env.cloud...%s\n" "$BLUE" "$RESET"
  cp "frontend/.env" "frontend/.env.cloud"
fi

printf "%s▸ Generating frontend/.env.local...%s\n" "$BLUE" "$RESET"
cat <<EOF > frontend/.env.local
EXPO_PUBLIC_SUPABASE_URL=${API_URL}
EXPO_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
EXPO_PUBLIC_SUPABASE_KEY=${ANON_KEY}
EOF

printf "%s▸ Activating local environment in frontend/.env...%s\n" "$BLUE" "$RESET"
cp "frontend/.env.local" "frontend/.env"

# 6. Apply Migrations & Baseline Seed
printf "\n%s▸ Applying migrations & baseline catalog seed (supabase/seed.sql)...%s\n" "$BLUE" "$RESET"
npx supabase db reset

printf "\n%s%s🎉 Local Supabase setup complete!%s\n\n" "$BOLD" "$GREEN" "$RESET"
printf "  %s• API Gateway:%s     %s\n" "$BOLD" "$RESET" "$API_URL"
printf "  %s• Studio Dashboard:%s http://127.0.0.1:54323 (open in browser to inspect DB)\n" "$BOLD" "$RESET"
printf "  %s• Inbucket Mail:%s    http://127.0.0.1:54324\n" "$BOLD" "$RESET"
printf "  %s• Database URL:%s     postgresql://postgres:postgres@127.0.0.1:54322/postgres\n\n" "$BOLD" "$RESET"

printf "%sUseful Commands:%s\n" "$BOLD" "$RESET"
printf "  %spnpm supabase:reset%s  — Wipe all test orders/tabs and restore fresh catalog & PINs\n" "$GREEN" "$RESET"
printf "  %spnpm env:local%s       — Point frontend to local Supabase\n" "$GREEN" "$RESET"
printf "  %spnpm env:cloud%s       — Point frontend back to Supabase Cloud\n" "$GREEN" "$RESET"
printf "  %spnpm supabase:stop%s   — Stop local containers\n\n" "$GREEN" "$RESET"
