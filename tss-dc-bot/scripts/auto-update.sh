#!/usr/bin/env bash
# Redeploys tss-dc-bot whenever origin/main has new commits. Meant to run
# periodically (cron/systemd timer) on the server hosting the bot, so a push
# from anyone gets picked up without someone having to SSH in and run the
# manual update command by hand.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_DIR"

git fetch origin main --quiet

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
  exit 0
fi

echo "[auto-update] $(date -Iseconds) origin/main moved $LOCAL -> $REMOTE, redeploying..."
git reset --hard origin/main
cd tss-dc-bot
docker compose up -d --build
echo "[auto-update] $(date -Iseconds) done."
