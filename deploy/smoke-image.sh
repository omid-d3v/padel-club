#!/usr/bin/env bash
# CI-only liveness/assets check, deliberately without any production private env.
set -euo pipefail
image="${1:?Image tag required}"
[[ "$image" =~ ^matchsho-web:(ci|[a-f0-9]{40})$ ]] || exit 2
cid="$(docker run -d -p 127.0.0.1:3100:3000 "$image")"
trap 'docker logs "$cid"; docker stop "$cid" >/dev/null' EXIT
for attempt in {1..40}; do
  if curl -fsS http://127.0.0.1:3100/api/health >/dev/null; then break; fi
  sleep 2
done
curl -fsS http://127.0.0.1:3100/api/health
curl -fsS http://127.0.0.1:3100/brand/matchsho/favicon.svg >/dev/null
