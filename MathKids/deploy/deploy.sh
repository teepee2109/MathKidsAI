#!/usr/bin/env bash
# Pull the latest code, rebuild the frontend and reload the API.
# Usage: bash /var/www/mathkid/MathKids/deploy/deploy.sh
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"

git -C "$root" pull --ff-only

echo "== Backend"
cd "$root/backend"
npm ci --omit=dev --no-audit --no-fund
pm2 startOrReload "$root/deploy/ecosystem.config.cjs" --update-env

echo "== Frontend"
cd "$root/frontend"
npm ci --no-audit --no-fund
npm run build

pm2 save
sleep 3
curl -fsS http://127.0.0.1:4000/api/health && echo && echo "Deploy OK"
