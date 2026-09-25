# syntax=docker/dockerfile:1

# Self-contained myechoBoard image with Ollama bundled.
# Copies the Ollama binary and libraries from the official ollama/ollama:latest
# image to avoid downloading via install.sh. The full host Ollama directory
# (including authenticated session, cache, and models) is injected at build time.

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

# --- Ollama source stage ---
FROM ollama/ollama:latest AS ollama

# --- Runtime image ---
FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production

# sharp needs libvips runtime libraries in Debian slim.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libvips42 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy Ollama binary and libraries from the host copy (matching the host's
# authenticated Ollama version).
COPY .ollama-host-bin/ollama /usr/local/bin/ollama
COPY .ollama-host-bin/lib /usr/local/lib/ollama

# Copy the entire authenticated Ollama directory from the build context.
# This includes id_ed25519, config, cache, and models.
# The build context is populated by scripts/build-ollama-image.sh and cleaned
# up immediately after the build.
COPY .ollama /root/.ollama
RUN chmod 600 /root/.ollama/id_ed25519

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
COPY --from=builder /app/docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

ENV HOST=0.0.0.0
ENV PORT=8080
ENV OLLAMA_HOST=http://localhost:11434

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 8080) + '/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["./docker-entrypoint.sh"]
