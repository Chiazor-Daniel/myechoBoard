# syntax=docker/dockerfile:1

# Multi-stage build for a small, self-contained myechoBoard app image.
# Designed to pair with a separate Ollama service (split deployment).
# Deploy to Dokploy, Google Cloud Run, Cloud Engine, or any container host.

FROM node:22-slim AS builder

WORKDIR /app

# Install build dependencies for native modules (sharp).
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN npm run build:client

# --- Runtime image ---
FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production

# sharp needs libvips runtime libraries in Debian slim.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libvips42 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy only what the production server needs.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/cli.js ./
COPY --from=builder /app/server.js ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/public ./public
COPY --from=builder /app/desktop ./desktop
COPY --from=builder /app/package.json ./
COPY --from=builder /app/README.md ./
COPY --from=builder /app/LICENSE ./
COPY --from=builder /app/NOTICE ./
COPY --from=builder /app/CONTRIBUTING.md ./
COPY --from=builder /app/CONTRIBUTOR-LICENSE-AGREEMENT.md ./
COPY --from=builder /app/TRADEMARKS.md ./
COPY --from=builder /app/COMMERCIAL-LICENSE.md ./

# Dokploy / Cloud Run default; override with --env PORT=... or docker run -e PORT=3888
ENV HOST=0.0.0.0
ENV PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 8080) + '/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
