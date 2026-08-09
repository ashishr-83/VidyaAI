#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

log() { printf '[vidyaai-install] %s\n' "$*"; }

# ?? Local env files (gitignored) ?????????????????????????????????????????????
if [[ ! -f .env ]]; then
  log "Creating root .env"
  cat > .env <<'EOF'
POSTGRES_PASSWORD=callmeVidya123
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
EOF
fi

if [[ ! -f .env.docker ]]; then
  log "Creating .env.docker"
  cat > .env.docker <<'EOF'
NODE_ENV=development
PORT=3000
POSTGRES_PASSWORD=callmeVidya123
DATABASE_URL=postgresql://vidyaai_admin:callmeVidya123@postgres:5432/vidyaai
REDIS_URL=redis://redis:6379
JWT_SECRET=vidyaai-dev-jwt-secret-minimum-32-chars-long
ANTHROPIC_API_KEY=sk-ant-dev-placeholder-replace-in-dashboard
AWS_REGION=ap-south-1
AWS_S3_BUCKET=vidyaai-audio
AWS_ENDPOINT_URL=http://minio:9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_TRANSCRIBE_LANGUAGE_CODE=hi-IN
EOF
fi

if [[ ! -f backend/.env ]]; then
  log "Creating backend/.env"
  cat > backend/.env <<'EOF'
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://vidyaai_admin:callmeVidya123@localhost:5432/vidyaai
REDIS_URL=redis://localhost:6379
JWT_SECRET=vidyaai-dev-jwt-secret-minimum-32-chars-long
ANTHROPIC_API_KEY=sk-ant-dev-placeholder-replace-in-dashboard
AWS_REGION=ap-south-1
AWS_S3_BUCKET=vidyaai-audio
AWS_ENDPOINT_URL=http://localhost:9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_TRANSCRIBE_LANGUAGE_CODE=hi-IN
EOF
fi

if [[ ! -f frontend/.env ]]; then
  log "Creating frontend/.env"
  echo 'VITE_API_URL=http://localhost:3000' > frontend/.env
fi

# ?? Node dependencies ????????????????????????????????????????????????????????
log "Installing backend dependencies"
(cd backend && npm ci)

log "Installing frontend dependencies"
(cd frontend && npm ci)

log "Generating Prisma client"
(cd backend && npx prisma generate)

log "Install complete"
