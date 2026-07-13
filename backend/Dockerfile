# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Install OpenSSL required by Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install deps first (layer cached unless package.json changes)
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY src ./src/
RUN npm run build

# Generate Prisma client — disable TLS verification for corporate proxy environments
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma generate

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-slim AS production

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output and Prisma client from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy startup script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Run as non-root user
RUN groupadd -r vidyaai && useradd -r -g vidyaai vidyaai
USER vidyaai

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
