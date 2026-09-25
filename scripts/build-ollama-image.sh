#!/bin/sh
set -e

# Build a self-contained myechoBoard image with Ollama bundled.
# This copies the host's system Ollama service directory (with models) and
# overlays the user's Ollama Cloud authentication session (config.json + keys).
# The combined .ollama directory is removed from the repo immediately after build.

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

if [ ! -f "${HOST_USER_OLLAMA}/id_ed25519" ] || [ ! -f "${HOST_USER_OLLAMA}/id_ed25519.pub" ]; then
  echo "ERROR: Ollama Cloud auth keys not found in ${HOST_USER_OLLAMA}" >&2
  echo "Please run 'ollama' or 'ollama login' first to create them." >&2
  exit 1
fi

if [ ! -f "${HOST_OLLAMA_BIN}" ] || [ ! -d "${HOST_OLLAMA_LIB}" ]; then
  echo "ERROR: Host Ollama binary not found at ${HOST_OLLAMA_BIN} or ${HOST_OLLAMA_LIB}" >&2
  exit 1
fi

mkdir -p "${BUILD_OLLAMA}"

if [ -d "${HOST_SYSTEM_OLLAMA}" ]; then
  cp -r "${HOST_SYSTEM_OLLAMA}"/. "${BUILD_OLLAMA}/"
fi

cp "${HOST_USER_OLLAMA}/id_ed25519" "${BUILD_OLLAMA}/id_ed25519"
cp "${HOST_USER_OLLAMA}/id_ed25519.pub" "${BUILD_OLLAMA}/id_ed25519.pub"
chmod 600 "${BUILD_OLLAMA}/id_ed25519"
if [ -f "${HOST_USER_OLLAMA}/config.json" ]; then
  cp "${HOST_USER_OLLAMA}/config.json" "${BUILD_OLLAMA}/config.json"
fi

mkdir -p "${REPO_ROOT}/.ollama-host-bin"
cp "${HOST_OLLAMA_BIN}" "${REPO_ROOT}/.ollama-host-bin/ollama"
cp -r "${HOST_OLLAMA_LIB}" "${REPO_ROOT}/.ollama-host-bin/lib"

echo "Building ${IMAGE_TAG} with bundled host Ollama + authenticated session..."
docker build -t "${IMAGE_TAG}" "${REPO_ROOT}"

echo "Build complete: ${IMAGE_TAG}"
