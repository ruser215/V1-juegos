#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_CMD="cd \"$ROOT_DIR/backend\" && [ -f .env ] || cp .env.example .env; npm run dev; exec bash"
FRONTEND_CMD="cd \"$ROOT_DIR\" && npm run dev; exec bash"

open_with_gnome() {
  gnome-terminal --title="Backend API" -- bash -lc "$BACKEND_CMD"
  gnome-terminal --title="Frontend Vite" -- bash -lc "$FRONTEND_CMD"
}

open_with_konsole() {
  konsole --new-tab -p tabtitle="Backend API" -e bash -lc "$BACKEND_CMD" &
  konsole --new-tab -p tabtitle="Frontend Vite" -e bash -lc "$FRONTEND_CMD" &
}

open_with_xterm() {
  xterm -T "Backend API" -e bash -lc "$BACKEND_CMD" &
  xterm -T "Frontend Vite" -e bash -lc "$FRONTEND_CMD" &
}

if command -v gnome-terminal >/dev/null 2>&1; then
  open_with_gnome
elif command -v konsole >/dev/null 2>&1; then
  open_with_konsole
elif command -v xterm >/dev/null 2>&1; then
  open_with_xterm
else
  echo "No encontré un emulador de terminal compatible (gnome-terminal, konsole o xterm)."
  echo "Usa: npm run arrancarTodo"
  exit 1
fi

echo "Terminales lanzadas: backend + frontend"
