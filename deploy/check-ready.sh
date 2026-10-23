#!/usr/bin/env bash
# Read-only diagnostics; no secrets printed.
set -euo pipefail
root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
free -h
df -h / /var/lib/docker
docker compose version
bash "$root/deploy/stack.sh" config --quiet
bash "$root/deploy/stack.sh" ps
bash "$root/deploy/stack.sh" exec -T db psql -X -h 127.0.0.1 -U postgres -d postgres -v ON_ERROR_STOP=1 < "$root/deploy/verify.sql"
docker stats --no-stream
