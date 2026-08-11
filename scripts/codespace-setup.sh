#!/usr/bin/env bash
set -euo pipefail

echo "==> Installing Ollama..."
curl -fsSL https://ollama.com/install.sh | sh

echo "==> Installing Node dependencies..."
npm ci

echo "==> Building client bundle..."
npm run build:client

echo "==> Pulling Ollama model..."
ollama pull kimi-k2.7-code:cloud

echo "==> Creating myechoBoard config..."
mkdir -p ~/.penecho
cat > ~/.penecho/config.env <<'EOF'
AI_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=kimi-k2.7-code:cloud
PENECHO_AI_IMAGE_FORMAT=png
AI_TIMEOUT_SECONDS=300
HOST=0.0.0.0
PORT=3888
AUTO_AI_DELAY_SECONDS=5
PENECHO_REQUEST_TRACE=false
EOF

echo "==> Codespace setup complete."
