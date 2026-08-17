#!/bin/sh
set -e

# Build a self-contained myechoBoard image with Ollama bundled.
# This temporarily copies your host Ollama auth keys into the build context
# so the container can authenticate to Ollama Cloud / private model registries.
# The keys are NOT committed to git; they are removed immediately after build.

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST_OLLAMA="${HOME}/.ollama"
BUILD_OLLAMA="${REPO_ROOT}/.ollama"
IMAGE_TAG="${1:-buzz3r/echoboard:latest}"

cleanup() {
  rm -rf "${BUILD_OLLAMA}"
}
trap cleanup EXIT

if [ ! -f "${HOST_OLLAMA}/id_ed25519" ] || [ ! -f "${HOST_OLLAMA}/id_ed25519.pub" ]; then
  echo "ERROR: Ollama auth keys not found in ${HOST_OLLAMA}" >&2
  echo "Please run 'ollama' at least once on this host to generate them, or copy them from your other machine." >&2
  exit 1
fi

mkdir -p "${BUILD_OLLAMA}"
cp "${HOST_OLLAMA}/id_ed25519" "${BUILD_OLLAMA}/id_ed25519"
cp "${HOST_OLLAMA}/id_ed25519.pub" "${BUILD_OLLAMA}/id_ed25519.pub"
chmod 600 "${BUILD_OLLAMA}/id_ed25519"
if [ -f "${HOST_OLLAMA}/config.json" ]; then
  cp "${HOST_OLLAMA}/config.json" "${BUILD_OLLAMA}/config.json"
fi

echo "Building ${IMAGE_TAG} with bundled Ollama..."
docker build -t "${IMAGE_TAG}" "${REPO_ROOT}"

echo "Build complete: ${IMAGE_TAG}"
