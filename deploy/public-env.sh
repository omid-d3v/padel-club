#!/usr/bin/env bash
# This is the ONLY configuration sent to the build runner. Never source the .env.
set -euo pipefail
root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
while IFS= read -r line || [[ -n "$line" ]]; do
  case "$line" in
    NEXT_PUBLIC_SITE_URL=*|NEXT_PUBLIC_SUPABASE_URL=*|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=*|NEXT_PUBLIC_FIREBASE_API_KEY=*|NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=*|NEXT_PUBLIC_FIREBASE_PROJECT_ID=*|NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=*|NEXT_PUBLIC_FIREBASE_APP_ID=*|NEXT_PUBLIC_FIREBASE_VAPID_KEY=*)
      # Reject dotenv interpolation, multiline values and GitHub environment commands.
      value="${line#*=}"
      [[ "$value" =~ ^[a-zA-Z0-9:/._+=,@-]*$ ]] || { echo 'Invalid public build configuration' >&2; exit 1; }
      printf '%s\n' "$line"
      ;;
  esac
done < "$root/deploy/.env.app"
