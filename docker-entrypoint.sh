#!/bin/sh
set -e

# Start the Ollama daemon in the background.
ollama serve &
OLLAMA_PID=$!

# Wait for the daemon to accept requests (max ~60s).
i=0
until ollama list >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -ge 60 ]; then
    echo "Ollama daemon failed to start within 60s." >&2
    exit 1
  fi
  sleep 1
done
echo "Ollama daemon is up."

# Ensure the configured model is available (local or cloud).
if [ -n "$OLLAMA_MODEL" ] && ! ollama list 2>/dev/null | grep -q "^$OLLAMA_MODEL[[:space:]]"; then
  echo "Pulling model $OLLAMA_MODEL ..."
  ollama pull "$OLLAMA_MODEL"
fi

# Launch the myechoBoard server as the foreground process.
exec node server.js
