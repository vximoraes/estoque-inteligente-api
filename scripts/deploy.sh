#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="${BASE_DIR:-$HOME/estoque-inteligente}"

exec 9>/tmp/estoque-inteligente-deploy.lock
flock 9

for repo in estoque-inteligente-api estoque-inteligente-front; do
  git -C "$BASE_DIR/$repo" fetch -q origin main
  git -C "$BASE_DIR/$repo" reset -q --hard origin/main
done

cd "$BASE_DIR/estoque-inteligente-api"
COMPOSE_FILES=(-f docker-compose.prod.yml)
[ -f docker-compose.local.yml ] && COMPOSE_FILES+=(-f docker-compose.local.yml)
docker compose "${COMPOSE_FILES[@]}" up -d --build --remove-orphans
docker image prune -f
