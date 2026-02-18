#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

echo "Iniciando backend..."
cd "$ROOT_DIR/backend"
if [[ ! -f .env ]]; then
  cp .env.example .env
fi
npm run dev &
BACKEND_PID=$!

sleep 2

echo "Iniciando frontend..."
cd "$ROOT_DIR"
npm run dev
