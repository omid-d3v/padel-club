#!/usr/bin/env bash
# Called from a verified, extracted release. Stable data lives OUTSIDE releases.
set -euo pipefail
umask 077
base=/opt/matchsho
sha="${1:?Release SHA required}"
mode="${2:?prepare or deploy required}"
[[ "$sha" =~ ^[a-f0-9]{40}$ && "$mode" =~ ^(prepare|deploy)$ ]] || exit 2
root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
[[ "$root" == "$base/releases/$sha" && "$(cat "$root/RELEASE")" == "$sha" ]] || exit 2
exec 9>"$base/deploy.lock"
flock -w 1800 9
state="$base/shared"
mkdir -p "$state/runtime" "$state/backups"
[[ ! -e "$root/deploy/runtime" ]] || { echo 'Release runtime must not be bundled'; exit 1; }
ln -s "$state/runtime" "$root/deploy/runtime"
ln -s "$state/backups" "$root/backups"
if [[ -f "$state/app.env" ]]; then ln -s "$state/app.env" "$root/deploy/.env.app"; fi
bundle="$base/incoming/$sha"
if [[ "$mode" == prepare ]]; then
  # Preparation can be repeated only BEFORE production activation. Never rotate keys.
  [[ ! -e "$state/production-ready" ]] || { echo 'Already live: infrastructure upgrades require a maintenance plan'; exit 1; }
  if [[ -f "$bundle/infra-images.tar.gz" ]]; then
    gzip -dc "$bundle/infra-images.tar.gz" | docker image load
    cp "$bundle/infra-images.json" "$state/runtime/infra-images.json"
    cp "$bundle/node-image.txt" "$state/runtime/node-image.txt"
  fi
  [[ ! -f "$state/runtime/node-image.txt" ]] || export MATCHSHO_NODE_IMAGE="$(cat "$state/runtime/node-image.txt")"
  if [[ ! -f "$state/app.env" ]]; then
    export MATCHSHO_UPSTREAM_ARCHIVE="$bundle/upstream.tar.gz"
    bash "$root/deploy/setup.sh" match-sho.com api.match-sho.com "${ACME_EMAIL:?Set GitHub ACME_EMAIL variable}"
    mv "$root/deploy/.env.app" "$state/app.env"
    ln -s "$state/app.env" "$root/deploy/.env.app"
  fi
  bash "$root/deploy/stack.sh" config --quiet
  ln -s "$root" "$base/current.next"
  mv -Tf "$base/current.next" "$base/current"
  echo 'Prepared ONLY. Restore Cloud data and Storage before activating production.'
  exit 0
fi
[[ -f "$state/production-ready" ]] || { echo 'Cloud migration/go-live not approved: see UBUNTU-GITHUB-DEPLOY.md'; exit 1; }
[[ -f "$state/app.env" && -f "$state/runtime/app-image.env" ]] || exit 1
previous="$(readlink -f "$base/current")"
[[ "$previous" == "$base/releases/"* && "$previous" != "$root" ]] || exit 1
# Refuse an older build arriving late. Approval is bound to the currently active SHA.
[[ "${EXPECTED_PREVIOUS_SHA:?}" == "$(cat "$previous/RELEASE")" ]] || { echo 'Active release changed. Rerun the workflow.'; exit 1; }
# These files can change ports, volumes, signing/config compatibility or upstream
# versions. Ordinary app deployment must never silently perform an infra upgrade.
for file in deploy/compose.yml deploy/stack.sh deploy/setup.sh deploy/configure.mjs deploy/Caddyfile; do
  cmp -s "$previous/$file" "$root/$file" || { echo "Infrastructure change in $file: manual maintenance/review required."; exit 1; }
done
gzip -dc "$bundle/web-image.tar.gz" | docker image load
export MATCHSHO_IMAGE="matchsho-web:$sha"
docker image inspect "$MATCHSHO_IMAGE" >/dev/null
bash "$root/deploy/stack.sh" config --quiet
# Snapshot before migrations; files require an off-host, quiesced backup as well.
bash "$previous/deploy/backup.sh"
bash "$root/deploy/migrate.sh" apply
bash "$root/deploy/migrate.sh" jobs
# Brief downtime, NOT blue/green. Database stays running. No automatic SQL rollback.
if ! bash "$root/deploy/stack.sh" up -d --no-build --pull never --no-deps --force-recreate --wait --wait-timeout 240 functions web caddy scheduler; then
  echo 'Deployment failed. Restoring previous application containers; DB migrations remain applied.' >&2
  unset MATCHSHO_IMAGE
  bash "$previous/deploy/stack.sh" up -d --no-build --pull never --no-deps --force-recreate --wait --wait-timeout 240 functions web caddy scheduler || true
  exit 1
fi
printf 'MATCHSHO_IMAGE=matchsho-web:%s\n' "$sha" > "$state/runtime/app-image.env.next"
mv "$state/runtime/app-image.env.next" "$state/runtime/app-image.env"
ln -s "$root" "$base/current.next"
mv -Tf "$base/current.next" "$base/current"
echo "Deployed $sha. Retained previous release, images, credentials and data."
# Diagnose sign-in configuration after a successful release, without changing
# identities, credentials or the outcome of the completed deployment.
if ! bash "$root/deploy/stack.sh" exec -T web node --input-type=module - --admin-auth-readiness < "$root/deploy/admin-auth-readiness.mjs"; then
  echo 'Admin authentication readiness check unavailable; deployment remains active.' >&2
fi
