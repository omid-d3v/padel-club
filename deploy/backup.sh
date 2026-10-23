#!/usr/bin/env bash
set -euo pipefail
umask 077
root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
mkdir -p "$root/backups"
destination="$(mktemp -d "$root/backups/selfhost-$(date -u +%Y%m%dT%H%M%SZ)-XXXXXX")"
bash "$root/deploy/stack.sh" exec -T db pg_dump -h 127.0.0.1 -U postgres -d postgres -Fc > "$destination/database.dump"
bash "$root/deploy/stack.sh" exec -T db pg_dumpall -h 127.0.0.1 -U postgres --roles-only > "$destination/roles.sql"
bash "$root/deploy/stack.sh" exec -T storage tar -C /var/lib/storage -czf - . > "$destination/storage.tar.gz"
bash "$root/deploy/stack.sh" exec -T db tar -C /etc/postgresql-custom -czf - . > "$destination/db-config.tar.gz"
cp -- "$root/deploy/.env.app" "$destination/app.env"
cp -- "$root/deploy/runtime/supabase/docker/.env" "$destination/supabase.env"
cp -- "$root/deploy/Caddyfile" "$destination/Caddyfile"
cp -- "$root/deploy/compose.yml" "$destination/compose.yml"
for file in infra-images.json app-image.env; do
  [[ ! -f "$root/deploy/runtime/$file" ]] || cp -- "$root/deploy/runtime/$file" "$destination/$file"
done
if [[ -f "$root/RELEASE" ]]; then
  cp -- "$root/RELEASE" "$destination/release.txt"
else
  git -C "$root" rev-parse HEAD > "$destination/release.txt"
fi
(cd "$destination" && {
  sha256sum database.dump roles.sql storage.tar.gz db-config.tar.gz app.env supabase.env Caddyfile compose.yml release.txt
  for file in infra-images.json app-image.env; do [[ ! -f "$file" ]] || sha256sum "$file"; done
} > SHA256SUMS)
echo "Backup saved to $destination. Contains secrets: encrypt and copy off-host. Online files are not an atomic snapshot; see the restore guide."
