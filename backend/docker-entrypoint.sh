#!/bin/sh
set -e

echo "Running Prisma migrations..."
NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma migrate deploy

echo "Starting VidyaAI backend..."
exec node dist/index.js
