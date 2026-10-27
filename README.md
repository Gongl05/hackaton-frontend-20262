# Log Pose Console

Consola en React + TypeScript para la hackathon de frontend de CS2031 (One Piece — Rumbo al Grand Line).
Consume la API del curso para el acceso de la tripulación, el dashboard y los carteles de "Se Busca".

## Integrantes

**Equipo:** Uliboy

| Nombre | Código |
|:-------|:-------|
| Mathias Pariona | 202210245 |
| Adriano Raffo | 202210481 |
| Gonzalo Gaviño | 202210146 |

**Código del equipo (`TEAM_CODE`):** `TEAM-___`

## Requisitos

- Node 24 LTS
- npm

## Cómo ejecutar

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Crear el archivo `.env` a partir del ejemplo. La app lee la URL de la API desde `VITE_API_BASE_URL`:

   ```bash
   cp .env.example .env
   ```

   ```txt
   VITE_API_BASE_URL=https://logpose-api-jg7f.onrender.com/api/v1
   ```

3. Levantar el servidor de desarrollo y abrir http://127.0.0.1:5173:

   ```bash
   npm run dev
   ```

4. Build de producción y vista previa:

   ```bash
   npm run build
   npm run preview
   ```

La cuenta de la tripulación se crea desde `/register` (o se usa la del equipo en `/login`). No se guardan
credenciales en el repositorio.

## Stack

React 19, TypeScript estricto, Vite, React Router, Tailwind CSS y Fetch API.

## Rutas

| Ruta | Descripción | Checkpoint |
|:-----|:------------|:-----------|
| `/login`, `/register` | Inicio de sesión y registro de la tripulación | CP1 |
| `/dashboard` | Indicadores de la tripulación y estado del Log Pose | CP1 |
| `/wanted` | Carteles de "Se Busca" con paginación, filtros, búsqueda y orden en la URL | CP2 |
| `/wanted/:id` | Detalle de un cartel | CP2 |
| `/news` | Noticias con scroll infinito por cursor y filtros en la URL | CP4 |
| `/news/:id` | Detalle de una noticia y verificación de rumores | CP4 |
| `/sagas` | Resumen de las sagas | CP5 |
| `/sagas/:id?etapa=slug` | Historia de la saga con scrollytelling y mapa del Grand Line | CP5 |
| `*` | Página 404 | CP1 |

## Estructura

```txt
src/
├── main.tsx           # Punto de entrada: router y proveedor de sesión
├── App.tsx            # Rutas, login/registro, rutas privadas, dashboard y 404
├── auth.tsx           # Contexto de sesión: restaurar, login, registro y logout
├── services.ts        # Cliente HTTP de la API y validación de respuestas
├── ConsoleLayout.tsx  # Layout de la consola (navegación lateral)
├── Wanted.tsx         # Listado y detalle de carteles
├── wanted-models.ts   # Tipos y lectura/escritura de los filtros en la URL
├── News.tsx           # Feed de noticias, detalle y verificación
├── news-models.ts     # Tipos y filtros de noticias
├── Sagas.tsx          # Resumen de sagas e historia con scrollytelling
├── saga-models.ts     # Tipos de sagas, etapas y paletas
├── components.tsx     # Componentes compartidos (estados, botones, íconos)
└── styles.css         # Tailwind y paleta de colores
```
