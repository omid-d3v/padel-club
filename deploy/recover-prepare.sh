#!/usr/bin/env bash
# Explicit recovery ONLY for a prepare that failed before creating either env.
# The original bundle/release remain intact. No containers/services are started.
set -euo pipefail
umask 077
trap 'printf "Recovery stopped safely at line %s\n" "$LINENO" >&2' ERR
base=/opt/matchsho
sha="${1:?Original prepared release SHA required}"
email="${2:?Real ACME email required}"
[[ "$sha" =~ ^[a-f0-9]{40}$ && "$email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]] || exit 2
[[ "$(id -un)" == matchsho && "$(uname -m)" == x86_64 ]] || exit 2
root="$base/releases/$sha"
bundle="$base/incoming/$sha"
state="$base/shared"
helper="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
[[ "$helper" == "$bundle/repair" ]] || { echo 'Copy recovery helpers into incoming/SHA/repair'; exit 1; }
exec 9>"$base/deploy.lock"
flock -w 1800 9
[[ "$(cat "$root/RELEASE")" == "$sha" && "$(cat "$bundle/RELEASE")" == "$sha" ]] || exit 1
[[ ! -e "$state/production-ready" && ! -e "$base/current" && ! -L "$base/current" && ! -e "$base/current.next" && ! -L "$base/current.next" ]] || { echo 'Not an unactivated, failed first prepare'; exit 1; }
[[ "$(readlink -f "$root/deploy/runtime")" == "$state/runtime" ]] || exit 1
vendor="$state/runtime/supabase"
for file in "$state/app.env" "$root/deploy/.env.app" "$vendor/docker/.env" "$vendor/docker/volumes/db/data/PG_VERSION"; do
  [[ ! -e "$file" && ! -L "$file" ]] || { echo 'Existing credentials/data found; refusing regeneration'; exit 1; }
done
[[ -z "$(docker ps -aq --filter label=com.docker.compose.project=matchsho)" ]] || { echo 'Existing project containers found'; exit 1; }
(cd "$bundle" && sha256sum --strict -c SHA256SUMS)
[[ "$(cat "$bundle/upstream.tar.gz.revision")" == bc27d2661edd09a5d0b8d76ce33da6d4071a756e ]] || exit 1
# Compare bytes and symlink targets, not UID/mode: non-root extraction intentionally
# changes archive ownership and umask. Retain this small trusted copy for audit.
backup="$(mktemp -d "$state/runtime/image-repair.XXXXXX")"
mkdir "$backup/upstream"
tar -xzf "$bundle/upstream.tar.gz" --no-same-owner --no-same-permissions -C "$backup/upstream"
diff -qr --no-dereference "$backup/upstream" "$vendor"
node_image="$(cat "$bundle/node-image.txt")"
if [[ "$node_image" =~ ^sha256:[a-f0-9]{64}$ ]]; then node_image="matchsho-infra:sha256-${node_image#sha256:}"; fi
[[ "$node_image" =~ ^matchsho-infra:sha256-[a-f0-9]{64}$ ]] || exit 1
[[ "$(docker image inspect "$node_image" --format '{{.Os}}/{{.Architecture}}')" == linux/amd64 ]] || exit 1
cp "$state/runtime/infra-images.json" "$backup/infra-images.before.json"
cp "$state/runtime/node-image.txt" "$backup/node-image.before.txt"
convert=(docker run --rm -i --pull=never --network=none --platform=linux/amd64 -v "$helper:/repair:ro" "$node_image" node /repair/offline-images.mjs)
"${convert[@]}" < "$bundle/infra-images.json" > "$backup/infra-images.after.json"
"${convert[@]}" refs < "$backup/infra-images.after.json" > "$backup/refs.txt"
while IFS= read -r image; do
  [[ "$(docker image inspect "$image" --format '{{.Os}}/{{.Architecture}}')" == linux/amd64 ]] || exit 1
done < "$backup/refs.txt"
printf '%s\n' "$node_image" > "$backup/node-image.after.txt"
cp "$backup/infra-images.after.json" "$state/runtime/infra-images.json"
cp "$backup/node-image.after.txt" "$state/runtime/node-image.txt"
docker run --rm --pull=never --network=none --platform=linux/amd64 --user "$(id -u):$(id -g)" \
  -v "$root:/workspace" -v "$state/runtime:$state/runtime" -w /workspace \
  "$node_image" node deploy/configure.mjs match-sho.com api.match-sho.com "$email"
mv "$root/deploy/.env.app" "$state/app.env"
ln -s "$state/app.env" "$root/deploy/.env.app"
bash "$root/deploy/stack.sh" config --quiet
ln -s "$root" "$base/current.next"
mv -T "$base/current.next" "$base/current"
echo 'Prepared ONLY using the existing bundle. No services started; migrate Cloud before activation.'
