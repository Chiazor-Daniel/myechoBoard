#!/bin/sh
set -e

# Build a self-contained myechoBoard image with Ollama bundled.
#
# The cloud-authenticated session is copied from the host's system Ollama
# service directory (/usr/share/ollama/.ollama on RPM installs, owned by the
# "ollama" user) because that is the session that performs authenticated
# cloud inference. The user's ~/.ollama is only used as a fallback and never
# overwrites a working system session: an unauthenticated user key bundles
# fine but every cloud inference inside the container fails with HTTP 401.
# The staged .ollama directory (keys included) is removed immediately after
# the build and is gitignored.

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST_USER_OLLAMA="${HOME}/.ollama"
HOST_SYSTEM_OLLAMA="/usr/share/ollama/.ollama"
HOST_OLLAMA_BIN="/usr/local/bin/ollama"
HOST_OLLAMA_LIB="/usr/local/lib/ollama"
BUILD_OLLAMA="${REPO_ROOT}/.ollama"
IMAGE_TAG="${1:-buzz3r/echoboard:latest}"

cleanup() {
  rm -rf "${BUILD_OLLAMA}"
  rm -rf "${REPO_ROOT}/.ollama-host-bin"
}
trap cleanup EXIT

copy_ollama_dir() {
  source="$1"
  # Only the session identity and config belong in the image. Never copy the
  # whole directory: it can hold tens of GB of downloaded models (cloud models
  # are registered by the entrypoint's `ollama pull`, not by local blobs).
  read_source() {
    if [ -r "$1" ]; then cat "$1"; else sudo cat "$1"; fi
  }
  mkdir -p "${BUILD_OLLAMA}"
  read_source "${source}/id_ed25519" > "${BUILD_OLLAMA}/id_ed25519"
  read_source "${source}/id_ed25519.pub" > "${BUILD_OLLAMA}/id_ed25519.pub"
  if sudo -n test -f "${source}/config.json" 2>/dev/null; then
    read_source "${source}/config.json" > "${BUILD_OLLAMA}/config.json"
  elif [ -f "${source}/config.json" ]; then
    cp "${source}/config.json" "${BUILD_OLLAMA}/config.json"
  fi
  chmod 600 "${BUILD_OLLAMA}/id_ed25519"
}

# Prefer the system daemon's directory (the session that does cloud
# inference); fall back to the user's directory on hosts without one.
# The system directory is 0700 ollama:ollama, so probe it through sudo.
AUTH_SOURCE=""
if sudo -n test -d "${HOST_SYSTEM_OLLAMA}" 2>/dev/null; then
  AUTH_SOURCE="${HOST_SYSTEM_OLLAMA}"
elif [ -f "${HOST_USER_OLLAMA}/id_ed25519" ]; then
  AUTH_SOURCE="${HOST_USER_OLLAMA}"
fi

if [ -z "${AUTH_SOURCE}" ]; then
  echo "ERROR: No Ollama session found." >&2
  echo "Run 'sudo ollama signin' as the ollama service user (or 'ollama login') first." >&2
  exit 1
fi

if [ ! -f "${HOST_OLLAMA_BIN}" ] || [ ! -d "${HOST_OLLAMA_LIB}" ]; then
  echo "ERROR: Host Ollama binary not found at ${HOST_OLLAMA_BIN} or ${HOST_OLLAMA_LIB}" >&2
  exit 1
fi

rm -rf "${BUILD_OLLAMA}"
copy_ollama_dir "${AUTH_SOURCE}"
echo "Bundling authenticated Ollama session from ${AUTH_SOURCE}"

mkdir -p "${REPO_ROOT}/.ollama-host-bin"
cp "${HOST_OLLAMA_BIN}" "${REPO_ROOT}/.ollama-host-bin/ollama"
cp -r "${HOST_OLLAMA_LIB}" "${REPO_ROOT}/.ollama-host-bin/lib"

echo "Building ${IMAGE_TAG} with bundled host Ollama + authenticated session..."
docker build -t "${IMAGE_TAG}" "${REPO_ROOT}"

echo "Build complete: ${IMAGE_TAG}"
echo "NOTE: verify with a real inference, not just /health:"
echo "  docker run --rm -d --name echoboard-verify -p 8080:8080 ${IMAGE_TAG}"
echo "  docker exec echoboard-verify node -e \"fetch('http://localhost:11434/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'gemma4:31b-cloud',messages:[{role:'user',content:'Say OK'}],stream:false})}).then(r=>{console.log('inference status:',r.status)})\""