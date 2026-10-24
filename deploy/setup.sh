#!/usr/bin/env bash
set -euo pipefail
umask 077
root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
runtime="$root/deploy/runtime/supabase"
revision=bc27d2661edd09a5d0b8d76ce33da6d4071a756e
node_image="${MATCHSHO_NODE_IMAGE:-node:24-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205}"
site="${1:-match-sho.com}"
api="${2:-api.match-sho.com}"
email="${3:?Usage: bash deploy/setup.sh match-sho.com api.match-sho.com YOUR_EMAIL}"
command -v git >/dev/null
docker info >/dev/null
docker compose version
if [[ -e "$runtime" ]]; then
  echo 'Runtime already exists. No files or credentials were changed. Use stack.sh for daily operations.' >&2
  exit 1
fi
[[ ! -e "$root/deploy/.env.app" ]] || { echo 'App configuration already exists; refusing to overwrite.' >&2; exit 1; }
mkdir -p "$root/deploy/runtime"
if [[ -n "${MATCHSHO_UPSTREAM_ARCHIVE:-}" ]]; then
  [[ "$(cat "${MATCHSHO_UPSTREAM_ARCHIVE}.revision")" == "$revision" ]]
  mkdir -p "$runtime"
  tar -xzf "$MATCHSHO_UPSTREAM_ARCHIVE" -C "$runtime"
  [[ -f "$runtime/docker/docker-compose.yml" && -f "$runtime/docker/.env.example" ]]
else
  git clone --filter=blob:none --no-checkout --depth=1 https://github.com/supabase/supabase.git "$runtime"
  git -C "$runtime" sparse-checkout init --cone
  git -C "$runtime" sparse-checkout set docker
  git -C "$runtime" fetch --depth=1 origin "$revision"
  git -C "$runtime" checkout --detach "$revision"
  [[ "$(git -C "$runtime" rev-parse HEAD)" == "$revision" ]]
fi
mounts=()
# A CI release's runtime is a symlink to persistent state outside the code tree.
runtime_real="$(cd "$root/deploy/runtime" && pwd -P)"
[[ "$runtime_real" == "$root/deploy/runtime" ]] || mounts+=(-v "$runtime_real:$runtime_real")
pull=()
[[ "$node_image" != matchsho-infra:* ]] || pull+=(--pull=never)
docker run --rm "${pull[@]}" --platform=linux/amd64 --user "$(id -u):$(id -g)" -v "$root:/workspace" "${mounts[@]}" -w /workspace \
  "$node_image" node deploy/configure.mjs "$site" "$api" "$email"
echo 'Prepared pinned Supabase v0.8.3 and private configuration. Nothing has been started.'
echo 'Review deploy/.env.app and deploy/runtime/supabase/docker/.env, especially SMTP.'
echo 'Compose 2.24.4+ is required. Next: bash deploy/stack.sh config --quiet'
