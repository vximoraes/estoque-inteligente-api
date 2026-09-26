#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="${BASE_DIR:-$HOME/estoque-inteligente}"

if [ -z "${DEPLOY_REPOS_ATUALIZADOS:-}" ]; then
  exec 9>/tmp/estoque-inteligente-deploy.lock
  flock 9

  for repo in estoque-inteligente-api estoque-inteligente-front; do
    git -C "$BASE_DIR/$repo" fetch -q origin main
    git -C "$BASE_DIR/$repo" reset -q --hard origin/main
  done

  DEPLOY_REPOS_ATUALIZADOS=1 exec "$BASE_DIR/estoque-inteligente-api/scripts/deploy.sh"
fi

cd "$BASE_DIR/estoque-inteligente-api"
COMPOSE_FILES=(-f docker-compose.prod.yml)
[ -f docker-compose.local.yml ] && COMPOSE_FILES+=(-f docker-compose.local.yml)
docker compose "${COMPOSE_FILES[@]}" up -d --build --remove-orphans
docker image prune -f
