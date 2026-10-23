#!/usr/bin/env bash
set -euo pipefail
umask 077
root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
mode="${1:-apply}"
case "$mode" in apply|baseline-cloud|jobs) ;; *) echo 'Use apply, baseline-cloud or jobs.' >&2; exit 1;; esac
sql_file="$(mktemp)"
trap 'rm -f -- "$sql_file"' EXIT
# Generate fully before executing; a failed planner cannot feed a partial script to psql.
bash "$root/deploy/stack.sh" run --rm --no-deps -T tools "$mode" > "$sql_file"
bash "$root/deploy/stack.sh" exec -T db psql -X -h 127.0.0.1 -U postgres -d postgres \
  --set=ON_ERROR_STOP=1 --file=- < "$sql_file"
