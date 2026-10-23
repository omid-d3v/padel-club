#!/usr/bin/env bash
set -euo pipefail
umask 077
base=/opt/matchsho
root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
sha="$(cat "$root/RELEASE")"
[[ "$root" == "$base/releases/$sha" && "$sha" =~ ^[a-f0-9]{40}$ ]] || exit 2
exec 9>"$base/deploy.lock"
flock -w 1800 9
[[ ! -e "$base/shared/production-ready" ]] || { echo 'Already activated'; exit 1; }
read -rp 'Cloud DB + Storage restored, baseline verified, backups and SMTP ready? Type MIGRATED: ' confirmation
[[ "$confirmation" == MIGRATED ]] || exit 1
bundle="$base/incoming/$sha/web-image.tar.gz"
[[ -f "$bundle" ]] || { echo 'Run the deploy workflow once to upload the first image, then retry.'; exit 1; }
gzip -dc "$bundle" | docker image load
export MATCHSHO_IMAGE="matchsho-web:$sha"
bash "$root/deploy/migrate.sh" apply
bash "$root/deploy/migrate.sh" jobs
bash "$root/deploy/stack.sh" up -d --no-build --pull never --wait --wait-timeout 300
printf 'MATCHSHO_IMAGE=%s\n' "$MATCHSHO_IMAGE" > "$base/shared/runtime/app-image.env"
touch "$base/shared/production-ready"
echo 'Activated. Run verify.sql and real booking/auth/receipt tests before ending maintenance.'
