#!/usr/bin/env bash
set -euo pipefail
root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
export MATCHSHO_ROOT="$root"
vendor="$root/deploy/runtime/supabase/docker"
[[ -f "$vendor/.env" && -f "$root/deploy/.env.app" ]] || { echo 'Run setup.sh first.' >&2; exit 1; }
# Optional offline image map and persisted application release. Neither contains secrets.
extra=()
[[ ! -f "$root/deploy/runtime/app-image.env" ]] || extra+=(--env-file "$root/deploy/runtime/app-image.env")
files=()
[[ ! -f "$root/deploy/runtime/infra-images.json" ]] || files+=(-f "$root/deploy/runtime/infra-images.json")
# Explicit paths and a stable project name keep mounts and volumes independent of cwd.
exec docker compose --project-name matchsho --project-directory "$vendor" \
  --env-file "$vendor/.env" --env-file "$root/deploy/.env.app" "${extra[@]}" \
  -f "$vendor/docker-compose.yml" -f "$root/deploy/compose.yml" "${files[@]}" "$@"
