#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$ROOT_DIR/.run"
BACKEND_PID_FILE="$RUN_DIR/backend.pid"
FRONTEND_PID_FILE="$RUN_DIR/frontend.pid"

stop_by_pid_file() {
  local service_name="$1"
  local pid_file="$2"

  if [[ ! -f "$pid_file" ]]; then
    echo "$service_name: no hay PID guardado."
    return
  fi

  local pid
  pid="$(cat "$pid_file")"

  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    echo "$service_name detenido (PID $pid)."
  else
    echo "$service_name: el proceso ya no estaba activo."
  fi

  rm -f "$pid_file"
}

stop_by_pid_file "Backend" "$BACKEND_PID_FILE"

stop_by_pid_file "Frontend" "$FRONTEND_PID_FILE"

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  docker compose -f "$ROOT_DIR/docker-compose.yml" stop ollama >/dev/null 2>&1 || true
  echo "Ollama detenido (si estaba levantado por docker compose)."
fi

echo "Parada completada."
