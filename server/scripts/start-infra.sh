#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/../.."

if command -v systemctl >/dev/null 2>&1 && systemctl is-system-running >/dev/null 2>&1; then
  systemctl start docker
else
  if ! docker info >/dev/null 2>&1; then
    nohup dockerd >/var/log/dockerd.log 2>&1 &
  fi
fi

for i in $(seq 1 20); do
  docker info >/dev/null 2>&1 && break
  sleep 1
done

docker compose up -d postgres redis
docker compose exec -T postgres pg_isready -U intervai
docker compose exec -T redis redis-cli ping
docker compose ps
