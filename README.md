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

## Arranque y parada unificados
Con un único script se levantan frontend + backend y, si Docker está disponible, también Ollama:

```bash
bash ./arrancarTodo.sh
```

Para parar todo:

```bash
bash ./pararTodo.sh
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

## Versión 5 - Asistente IA con lfm2.5-thinking (1.2b)

### Qué incluye
- Frontend dockerizado (Nginx).
- Contenedor Ollama.
- Asistente IA con botón flotante en esquina inferior derecha.
- Reglas estrictas para responder **solo** sobre videojuegos existentes en la base de datos actual.

### Levantar todo con Docker Compose
```bash
docker compose up -d --build
```

Servicios:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000/api`
- Ollama: `http://localhost:11434`

### Ejecutar y probar Ollama (pull + run)
1) Entra al contenedor:
```bash
docker exec -it ollama-lfm sh
```

2) Haz pull del modelo:
```bash
ollama pull lfm2.5-thinking:1.2b
```

3) Prueba rápida del modelo:
```bash
ollama run lfm2.5-thinking:1.2b "Recomiéndame un juego de acción"
```

También puedes probar desde fuera del contenedor:
```bash
curl http://localhost:11434/api/chat \
	-H "Content-Type: application/json" \
	-d '{"model":"lfm2.5-thinking:1.2b","stream":false,"messages":[{"role":"user","content":"hola"}]}'
```

### Endpoint del asistente
- `POST /api/assistant/chat`
- Body:
```json
{
	"message": "¿Qué juego me recomiendas por popularidad?"
}
```

### Instrucciones de comportamiento del asistente
El backend define reglas para que el asistente:
- Responda solo sobre videojuegos presentes en la BD actual.
- No invente datos externos.
- Recomiende con criterios reales de la BD (popularidad, precio, compañía, etc.).
- Rechace preguntas fuera de alcance con una respuesta acotada.

## Versión 6 - Tests End-to-End (Playwright)

Se añadió una suite E2E en `tests/e2e/version6.spec.js` que cubre:
- Registro de usuario.
- Login incorrecto.
- Redirección de ruta protegida sin sesión.
- Listado de videojuegos.
- Búsqueda.
- Filtros por categorías.
- Paginación.
- Crear videojuego.
- Ver detalle.
- Eliminar videojuego desde detalle.
- Logout y bloqueo de rutas protegidas.

### Ejecutar E2E

1) Arranca la app (frontend + backend), por ejemplo:
```bash
bash ./arrancarTodo.sh
```

2) En otra terminal, instala dependencias del proyecto raíz:
```bash
npm install
```

3) Instala Chromium para Playwright (solo primera vez):
```bash
npx playwright install chromium
```

4) Ejecuta los tests:
```bash
npm run test:e2e
```

Opcionales:
```bash
npm run test:e2e:headed
npm run test:e2e:ui
```
