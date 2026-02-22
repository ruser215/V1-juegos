#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$ROOT_DIR/.run"
BACKEND_PID_FILE="$RUN_DIR/backend.pid"
FRONTEND_PID_FILE="$RUN_DIR/frontend.pid"

mkdir -p "$RUN_DIR"

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

start_ollama() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker no está disponible, se omite Ollama."
    return
  fi

  if ! docker info >/dev/null 2>&1; then
    echo "Docker no está activo, se omite Ollama."
    return
  fi

  echo "Iniciando Ollama (docker compose up -d ollama)..."
  docker compose -f "$ROOT_DIR/docker-compose.yml" up -d ollama >/dev/null
}

start_backend() {
  if port_in_use 4000; then
    echo "Backend ya está en ejecución (puerto 4000)."
    return
  fi

  echo "Iniciando backend en segundo plano..."
  pushd "$ROOT_DIR/backend" >/dev/null
  if [[ ! -f .env ]]; then
    cp .env.example .env
  fi
  nohup npm run dev >"$RUN_DIR/backend.log" 2>&1 &
  echo $! >"$BACKEND_PID_FILE"
  popd >/dev/null
}

start_frontend() {
  if port_in_use 5173; then
    echo "Frontend ya está en ejecución (puerto 5173)."
    return
  fi

  echo "Iniciando frontend en segundo plano..."
  pushd "$ROOT_DIR" >/dev/null
  nohup npm run dev >"$RUN_DIR/frontend.log" 2>&1 &
  echo $! >"$FRONTEND_PID_FILE"
  popd >/dev/null
}

start_ollama
start_backend
sleep 2
start_frontend
sleep 2

echo ""
echo "Servicios arrancados."
echo "- Frontend: http://localhost:5173"
echo "- Backend:  http://localhost:4000/api"
echo "- Ollama:   http://localhost:11434 (si Docker estaba disponible)"
echo ""
echo "Logs en: $RUN_DIR"
echo "Para parar todo: bash ./pararTodo.sh"
