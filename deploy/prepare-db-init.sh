#!/usr/bin/env bash
# Keep credentials private while allowing the pinned image's postgres group to
# read the upstream init SQL files mounted individually by Compose.
set -euo pipefail
root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
bash "$root/deploy/stack.sh" run --rm --no-deps -T --pull never \
  --user root --entrypoint bash db -euc '
  group="$(id -g postgres)"
  for file in \
    /docker-entrypoint-initdb.d/init-scripts/98-webhooks.sql \
    /docker-entrypoint-initdb.d/init-scripts/99-roles.sql \
    /docker-entrypoint-initdb.d/init-scripts/99-jwt.sql \
    /docker-entrypoint-initdb.d/migrations/97-_supabase.sql \
    /docker-entrypoint-initdb.d/migrations/99-realtime.sql \
    /docker-entrypoint-initdb.d/migrations/99-logs.sql \
    /docker-entrypoint-initdb.d/migrations/99-pooler.sql; do
    test -f "$file"
    chgrp "$group" "$file"
    chmod 640 "$file"
  done
  echo "Init SQL readable by its owner and the postgres group only."
  ' < /dev/null
