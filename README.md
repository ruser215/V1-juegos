# Proyecto Videojuegos - Versión 2

## Stack y justificación
- **Frontend:** React + Vite + React Router + Axios.
	- Vite permite iteración rápida.
	- React Router facilita separar rutas públicas/protegidas.
	- Axios simplifica peticiones y el envío automático del token.
- **Backend:** Node.js + Express + JWT.
	- Express permite crear una API REST de forma simple para clase.
	- JWT cubre autenticación stateless con roles.
- **Persistencia:** SQLite (`backend/data.sqlite`).
	- Es ligera, persistente y fácil de usar en entorno local.
- **Contenedores:** Docker para backend.

## Estructura principal
- `backend/`: API JWT con CRUD y roles.
- `src/`: frontend React V2.

## Requisitos implementados V2
- Registro y login con JWT.
- Roles `user` y `admin`.
- Endpoints protegidos:
	- `GET /api/games` (todos, paginación)
	- `GET /api/games/mine` (mis juegos, paginación)
	- `GET /api/games/:id`
	- `POST /api/games`
	- `DELETE /api/games/:id` (owner o admin)
- Rutas frontend:
	- Públicas: `/login`, `/register`
	- Protegidas: `/juegos`, `/mis-juegos`, `/juegos/nuevo`, `/juegos/:id`
- Contexto de autenticación y redirección a `/login` si no hay sesión.
- Componente de carga (`Loading`).

## Ejecutar frontend
```bash
npm install
npm run dev
```

## Ejecutar backend
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Backend en `http://localhost:4000` y API en `http://localhost:4000/api`.

Usuario admin inicial:
- email: `admin@demo.com`
- password: `admin123`

## Docker backend
```bash
cd backend
docker build -t backend-juegos-v2 .
docker run -p 4000:4000 backend-juegos-v2
```
