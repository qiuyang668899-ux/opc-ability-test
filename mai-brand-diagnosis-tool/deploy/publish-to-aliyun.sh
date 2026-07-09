#!/usr/bin/env bash
set -euo pipefail

SERVER_HOST="${SERVER_HOST:-}"
SERVER_USER="${SERVER_USER:-root}"
SERVER_PORT="${SERVER_PORT:-22}"
APP_DIR="${APP_DIR:-/opt/mai-brand-diagnosis-tool}"
SSH_KEY="${SSH_KEY:-}"

if [[ -z "${SERVER_HOST}" ]]; then
  echo "Missing SERVER_HOST. Example:"
  echo "SERVER_HOST=1.2.3.4 SSH_KEY=~/.ssh/id_rsa bash deploy/publish-to-aliyun.sh"
  exit 1
fi

SSH_OPTS=(-p "${SERVER_PORT}" -o StrictHostKeyChecking=accept-new)
if [[ -n "${SSH_KEY}" ]]; then
  SSH_OPTS+=(-i "${SSH_KEY}")
fi

TMP_ARCHIVE="$(mktemp -t mai-brand-diagnosis.XXXXXX.tar.gz)"
cleanup() {
  rm -f "${TMP_ARCHIVE}"
}
trap cleanup EXIT

tar \
  --exclude ".git" \
  --exclude "node_modules" \
  --exclude "*.zip" \
  --exclude "*.log" \
  --exclude ".playwright-cli" \
  --exclude "麦一联盟品牌诊断工具_旧版备份_*" \
  -czf "${TMP_ARCHIVE}" .

ssh "${SSH_OPTS[@]}" "${SERVER_USER}@${SERVER_HOST}" "mkdir -p '${APP_DIR}'"
scp "${SSH_OPTS[@]}" "${TMP_ARCHIVE}" "${SERVER_USER}@${SERVER_HOST}:/tmp/mai-brand-diagnosis.tar.gz"

ssh "${SSH_OPTS[@]}" "${SERVER_USER}@${SERVER_HOST}" "set -euo pipefail
cd '${APP_DIR}'
tar -xzf /tmp/mai-brand-diagnosis.tar.gz
rm -f /tmp/mai-brand-diagnosis.tar.gz
if [ ! -f .env ]; then
  cp .env.example .env
  echo 'Created .env from .env.example. Please fill DEEPSEEK_API_KEY before starting.'
fi
docker compose -f docker-compose.aliyun.yml up -d --build
docker compose -f docker-compose.aliyun.yml ps
"

echo "Published to ${SERVER_HOST}:${APP_DIR}"
