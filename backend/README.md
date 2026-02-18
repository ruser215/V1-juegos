# Backend V2 - JWT + CRUD Videojuegos

## Stack
- Node.js + Express
- SQLite (persistente en `data.sqlite`)
- JWT para autenticación
- Docker para despliegue

## Ejecutar en local
1. Copia `.env.example` a `.env`
2. Instala dependencias: `npm install`
3. Ejecuta: `npm run dev`

Por defecto corre en `http://localhost:4000`.

Usuario admin inicial:
- email: `admin@demo.com`
- password: `admin123`

## Docker
```bash
docker build -t backend-juegos-v2 .
docker run -p 4000:4000 --name backend-juegos-v2 backend-juegos-v2
```
