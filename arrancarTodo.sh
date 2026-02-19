#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

port_in_use() {
  local port="$1"

  if command -v ss >/dev/null 2>&1; then
    ss -ltn | awk '{print $4}' | grep -Eq "[:.]${port}$"
    return $?
  fi

  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"${port}" -sTCP:LISTEN -t >/dev/null 2>&1
    return $?
  fi

  return 1
}

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

if port_in_use 4000; then
  echo "Backend ya está en ejecución (puerto 4000)."
else
  echo "Iniciando backend..."
  cd "$ROOT_DIR/backend"
  if [[ ! -f .env ]]; then
    cp .env.example .env
  fi
  npm run dev &
  BACKEND_PID=$!
  sleep 2
fi

if port_in_use 5173; then
  echo "Frontend ya está en ejecución (puerto 5173)."
  echo "No se inicia otro para evitar puertos duplicados."
  exit 0
else
  echo "Iniciando frontend..."
  cd "$ROOT_DIR"
  npm run dev
fi
