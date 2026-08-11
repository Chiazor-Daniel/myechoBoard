#!/usr/bin/env bash
set -euo pipefail

echo "==> Starting Ollama..."
nohup ollama serve > /tmp/ollama.log 2>>1 &

# Wait for Ollama to be ready
for i in {1..30}; do
  if curl -s http://localhost:11434/api/tags >/dev/null; then
    echo "==> Ollama is ready."
    break
  fi
  sleep 1
done

echo "==> Starting myechoBoard..."
set -a
source ~/.penecho/config.env
set +a
node server.js
