#!/usr/bin/env bash
# CI only: configure a pinned connection, then perform read-only server checks.
set -euo pipefail
umask 077
[[ "${DEPLOY_HOST:-}" =~ ^[a-zA-Z0-9.-]+$ && "${DEPLOY_USER:-}" =~ ^[a-z_][a-z0-9_-]*$ && "${DEPLOY_PORT:-}" =~ ^[0-9]{1,5}$ ]] || { echo 'Invalid or missing deployment variables'; exit 1; }
(( 10#$DEPLOY_PORT >= 1 && 10#$DEPLOY_PORT <= 65535 )) || exit 1
[[ -n "${SSH_KEY:-}" && -n "${KNOWN_HOSTS:-}" ]] || { echo 'Missing DEPLOY_SSH_KEY or DEPLOY_KNOWN_HOSTS secret'; exit 1; }
install -m 700 -d ~/.ssh
printf '%s\n' "$SSH_KEY" | tr -d '\r' > ~/.ssh/matchsho
printf '%s\n' "$KNOWN_HOSTS" | tr -d '\r' > ~/.ssh/known_hosts
chmod 600 ~/.ssh/matchsho ~/.ssh/known_hosts
ssh-keygen -y -P '' -f ~/.ssh/matchsho >/dev/null || { echo 'Deploy key must be a valid unencrypted private key'; exit 1; }
host="$DEPLOY_HOST"
[[ "$DEPLOY_PORT" == 22 ]] || host="[$DEPLOY_HOST]:$DEPLOY_PORT"
ssh-keygen -F "$host" -f ~/.ssh/known_hosts >/dev/null || { echo 'DEPLOY_KNOWN_HOSTS must contain the verified key for the current IP and port'; exit 1; }
printf 'Host matchsho\n HostName %s\n User %s\n Port %s\n IdentityFile ~/.ssh/matchsho\n IdentitiesOnly yes\n BatchMode yes\n StrictHostKeyChecking yes\n ConnectTimeout 15\n ConnectionAttempts 2\n ServerAliveInterval 30\n ServerAliveCountMax 10\n' "$DEPLOY_HOST" "$DEPLOY_USER" "$DEPLOY_PORT" > ~/.ssh/config
ssh matchsho 'set -eu
test -d /opt/matchsho/incoming
docker info >/dev/null
test "$(uname -m)" = x86_64
printf "SSH, deployment directory, Docker access and architecture: OK\n"
if test -f /opt/matchsho/current/RELEASE; then printf "Prepared release: "; cat /opt/matchsho/current/RELEASE; else printf "No prepared release yet\n"; fi
if test -f /opt/matchsho/shared/production-ready; then printf "Production activated: yes\n"; else printf "Production activated: no; keep AUTO_DEPLOY=false\n"; fi'
