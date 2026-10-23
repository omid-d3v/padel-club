#!/usr/bin/env bash
# Run as matchsho, from a trusted GitHub artifact copied over verified SSH.
set -euo pipefail
umask 077
base=/opt/matchsho
bundle="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
sha="$(cat "$bundle/RELEASE")"
kind="$(cat "$bundle/BUNDLE_KIND")"
[[ "$sha" =~ ^[a-f0-9]{40}$ && "$kind" =~ ^(prepare|deploy)$ ]] || exit 2
[[ "$bundle" == "$base/incoming/$sha" ]] || { echo "Copy the files into $base/incoming/$sha first"; exit 1; }
[[ "$(id -un)" == matchsho ]] || { echo 'Run as matchsho, not root'; exit 1; }
[[ "$(uname -m)" == x86_64 ]] || exit 1
cd "$bundle"
# Check names BEFORE sha256sum can follow any path from a supplied manifest.
allowed='(RELEASE|BUNDLE_KIND|install-offline\.sh|source\.tar\.gz|upstream\.tar\.gz|upstream\.tar\.gz\.revision|infra-images\.tar\.gz|infra-images\.json|node-image\.txt|public\.env|web-image\.tar\.gz)'
while IFS= read -r line; do
  [[ "$line" =~ ^[a-f0-9]{64}\ \ ${allowed}$ ]] || { echo 'Invalid checksum manifest'; exit 1; }
  [[ -f "${line:66}" && ! -L "${line:66}" ]] || exit 1
done < SHA256SUMS
required=(RELEASE BUNDLE_KIND install-offline.sh source.tar.gz)
if [[ "$kind" == prepare ]]; then
  required+=(upstream.tar.gz upstream.tar.gz.revision infra-images.tar.gz infra-images.json node-image.txt)
else
  required+=(public.env web-image.tar.gz)
fi
for file in "${required[@]}"; do grep -Eq "^[a-f0-9]{64}  ${file//./\\.}$" SHA256SUMS || exit 1; done
sha256sum --strict -c SHA256SUMS
docker info >/dev/null
available="$(df -B1 --output=avail "$base" | tail -n 1)"
size="$(du -sb "$bundle" | cut -f1)"
(( available > size * 5 + 5368709120 )) || { echo 'Need more free disk headroom. Do not prune data volumes.'; exit 1; }
state="$base/shared"
if [[ "$kind" == prepare ]]; then
  export ACME_EMAIL="${1:?Usage: bash install-offline.sh YOUR_REAL_EMAIL}"
  [[ ! -f "$state/production-ready" ]] || { echo 'Already live; do not re-prepare infrastructure'; exit 1; }
else
  [[ -f "$state/app.env" && -f "$base/current/RELEASE" ]] || { echo 'Install prepare bundle first'; exit 1; }
  actual="$(bash "$base/current/deploy/public-env.sh" | LC_ALL=C sort)"
  expected="$(LC_ALL=C sort public.env)"
  [[ "$actual" == "$expected" ]] || { echo 'Public build config differs from server. Rebuild with current public-env.sh output.'; exit 1; }
  if [[ ! -f "$state/production-ready" ]]; then
    [[ "$(cat "$base/current/RELEASE")" == "$sha" ]] || { echo 'First prepare and site bundle must use the same commit'; exit 1; }
    echo 'Site image delivered ONLY. Restore Cloud DB and Storage, then run current/deploy/activate.sh.'
    exit 0
  fi
  export EXPECTED_PREVIOUS_SHA="$(cat "$base/current/RELEASE")"
  [[ "$EXPECTED_PREVIOUS_SHA" != "$sha" ]] || { echo 'Already active. Nothing changed.'; exit 0; }
fi
target="$base/releases/$sha"
[[ ! -e "$target" ]] || { echo 'Release exists; refusing overwrite. See OFFLINE-DEPLOY.md recovery guidance.'; exit 1; }
# Git source archives must contain only ordinary files/directories, never links/traversal.
tar -tzf source.tar.gz | awk '/^\// || /(^|\/)\.\.(\/|$)/ || /^deploy\/runtime\// || /^backups\// {bad=1} /(^|\/)\.env/ && !/(^|\/)\.env\.example$/ {bad=1} END {exit bad}'
tar -tvzf source.tar.gz | awk 'substr($0,1,1)!="-" && substr($0,1,1)!="d" {bad=1} END {exit bad}'
mkdir "$target"
tar -xzf source.tar.gz --no-same-owner --no-same-permissions -C "$target"
cp RELEASE "$target/RELEASE"
bash "$target/deploy/release.sh" "$sha" "$kind"
