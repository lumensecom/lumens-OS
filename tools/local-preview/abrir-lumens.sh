#!/usr/bin/env bash
set -euo pipefail

bundleDir="$(cd -- "$(dirname -- "$0")" && pwd)"
composeFile="$bundleDir/tools/local-preview/compose.yaml"
if [[ -f "$bundleDir/compose.yaml" ]]; then
  composeFile="$bundleDir/compose.yaml"
fi
export LUMENS_PREVIEW_PORT="${LUMENS_PREVIEW_PORT:-3000}"
docker compose -f "$composeFile" up -d --build --wait
url="http://localhost:$LUMENS_PREVIEW_PORT/"
printf '%s\n' "$url"
if command -v open >/dev/null 2>&1; then
  open "$url"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$url"
fi
