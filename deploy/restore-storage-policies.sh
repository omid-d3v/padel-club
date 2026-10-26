#!/usr/bin/env bash
set -euo pipefail
root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
# Creating Storage policies also requires resolving auth.uid(). The Storage
# owner lacks auth-schema USAGE in the pinned self-hosted stack. Use the internal
# admin socket for this bounded SQL file only. General app migrations still run
# as postgres; neither role memberships nor object ownership are changed here.
bash "$root/deploy/stack.sh" exec --user postgres -T db \
  psql -X -U supabase_admin -d postgres --set=ON_ERROR_STOP=1 --file=- \
  < "$root/deploy/restore-storage-policies.sql"
