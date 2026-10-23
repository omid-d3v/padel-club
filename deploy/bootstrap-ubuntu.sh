#!/usr/bin/env bash
# Fresh Ubuntu amd64 only. Review before running as root. Does NOT deploy the app.
set -euo pipefail
umask 077
[[ $EUID -eq 0 ]] || { echo 'Run with sudo'; exit 1; }
[[ ! -f /opt/matchsho/shared/production-ready ]] || { echo 'Not a fresh server: refusing bootstrap'; exit 1; }
source /etc/os-release
[[ "$ID" == ubuntu && "$VERSION_ID" =~ ^(22\.04|24\.04|26\.04)$ && "$(uname -m)" == x86_64 ]] || { echo 'Supported: Ubuntu 22.04/24.04/26.04 LTS amd64'; exit 1; }
arvan_apt=false; ubuntu_docker=false; docker_mirror=false
for option in "$@"; do
  case "$option" in
    --arvan-apt) arvan_apt=true ;;
    --ubuntu-docker) ubuntu_docker=true ;;
    --docker-mirror) docker_mirror=true ;;
    *) echo "Unknown option: $option"; exit 2 ;;
  esac
done
if [[ "$arvan_apt" == true ]]; then
  saved="$(mktemp -d /var/backups/matchsho-apt-XXXXXX)"
  for file in /etc/apt/sources.list /etc/apt/sources.list.d/*.sources /etc/apt/sources.list.d/*.list; do
    [[ -f "$file" ]] || continue
    cp --parents "$file" "$saved"
    tmp="$(mktemp)"
    # Preserve suites/components and Ubuntu signing keys; change only archive URIs.
    sed -E 's#https?://([a-zA-Z0-9.-]+\.)?archive\.ubuntu\.com/ubuntu/?#http://mirror.arvancloud.ir/ubuntu/#g; s#https?://security\.ubuntu\.com/ubuntu/?#http://mirror.arvancloud.ir/ubuntu/#g' "$file" > "$tmp"
    cat "$tmp" > "$file"
    rm -f -- "$tmp"
  done
  echo "APT source backups: $saved. Signature verification remains enabled."
fi
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl git jq openssl ufw gzip tar util-linux
if ! command -v docker >/dev/null; then
  if [[ "$ubuntu_docker" == true ]]; then
    apt-get install -y docker.io docker-compose-v2
  else
    install -m 0755 -d /etc/apt/keyrings
    curl --connect-timeout 20 --max-time 120 -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    printf 'Types: deb\nURIs: https://download.docker.com/linux/ubuntu\nSuites: %s\nComponents: stable\nSigned-By: /etc/apt/keyrings/docker.asc\nArchitectures: amd64\n' "$VERSION_CODENAME" > /etc/apt/sources.list.d/docker.sources
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  fi
fi
version="$(docker compose version --short | sed 's/^v//')"
[[ "$(printf '2.24.4\n%s\n' "$version" | sort -V | head -n 1)" == 2.24.4 ]] || { echo 'Compose 2.24.4+ required; upgrade before continuing'; exit 1; }
if [[ "$docker_mirror" == true ]]; then
  install -m 0755 -d /etc/docker
  config=/etc/docker/daemon.json
  if [[ -f "$config" ]]; then
    cp "$config" "$config.matchsho-backup-$(date -u +%Y%m%dT%H%M%SZ)"
  else
    printf '{}\n' > "$config"
  fi
  tmp="$(mktemp)"
  jq '. + {"registry-mirrors": ["https://docker.arvancloud.ir"]}' "$config" > "$tmp"
  dockerd --validate --config-file "$tmp"
  install -m 0644 "$tmp" "$config"
  rm -f -- "$tmp"
fi
systemctl enable --now docker
if [[ "$docker_mirror" == true ]]; then systemctl restart docker; fi
id matchsho >/dev/null 2>&1 || useradd --create-home --shell /bin/bash matchsho
usermod -aG docker matchsho
install -m 0750 -o matchsho -g matchsho -d /opt/matchsho /opt/matchsho/releases /opt/matchsho/incoming /opt/matchsho/shared
install -m 0700 -o matchsho -g matchsho -d /home/matchsho/.ssh
if [[ -f /tmp/matchsho-ci.pub && ! -e /home/matchsho/.ssh/authorized_keys ]]; then
  # Disable forwarding/PTY; keep exec/SFTP for deployment.
  { printf 'restrict '; cat /tmp/matchsho-ci.pub; } > /home/matchsho/.ssh/authorized_keys
  chown matchsho:matchsho /home/matchsho/.ssh/authorized_keys
  chmod 0600 /home/matchsho/.ssh/authorized_keys
fi
echo 'Bootstrap complete. Docker group is root-equivalent: protect the CI key.'
echo 'No SSH policy, firewall rules, domain, database or application was changed.'
echo 'Next: verify SSH key login, firewall, then run GitHub prepare workflow.'
