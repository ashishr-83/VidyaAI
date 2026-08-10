#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

log() { printf '[vidyaai-start] %s\n' "$*"; }

# Docker daemon (nested containers in Cloud Agent VMs)
if ! docker info >/dev/null 2>&1; then
  log "Starting Docker daemon"
  if [[ -S /var/run/docker.sock ]]; then
    sudo chmod 666 /var/run/docker.sock 2>/dev/null || true
  else
    sudo dockerd >/tmp/dockerd.log 2>&1 &
    for _ in $(seq 1 30); do
      docker info >/dev/null 2>&1 && break
      sleep 1
    done
    sudo chmod 666 /var/run/docker.sock 2>/dev/null || true
  fi
fi

if ! docker info >/dev/null 2>&1; then
  log "ERROR: Docker is not available"
  exit 1
fi

# Free ports used by optional host Postgres/Redis when Docker Compose owns them.
if command -v ss >/dev/null 2>&1; then
  if ss -ltn | grep -q ':5432 '; then
    if ! docker compose ps --status running 2>/dev/null | grep -q postgres; then
      log "Stopping host PostgreSQL to free port 5432"
      sudo service postgresql stop 2>/dev/null || true
    fi
  fi
  if ss -ltn | grep -q ':6379 '; then
    if ! docker compose ps --status running 2>/dev/null | grep -q redis; then
      log "Stopping host Redis to free port 6379"
      sudo service redis-server stop 2>/dev/null || true
    fi
  fi
fi

# Infrastructure (Postgres, Redis, MinIO)
log "Starting infrastructure services"
docker compose up -d postgres redis minio minio-init

log "Waiting for Postgres"
for _ in $(seq 1 60); do
  if docker compose exec -T postgres pg_isready -U vidyaai_admin -d vidyaai >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

log "Waiting for Redis"
for _ in $(seq 1 30); do
  if docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then
    break
  fi
  sleep 1
done

# Database schema
log "Applying Prisma schema"
(cd backend && npx prisma db push --skip-generate)

log "Startup complete - backend :3000, frontend :5173"
