# Listing lookup frontend

A small React page for looking up an OpenSooq listing by ID through the backend API. It displays the listing's title, description, price, location, and custom parameters, along with loading and API error states.

## Prerequisites

- Node.js 18 or newer
- The backend running and connected to its MySQL and Memcached services

## Configure the API URL

Copy `.env.example` to `.env` and set `VITE_API_URL` to the backend origin. The default local value is:

```env
VITE_API_URL=http://localhost:3001
```

For local development, the backend's `FRONTEND_ORIGIN` must include the Vite origin (`http://localhost:5173`). The backend defaults to that origin; set `FRONTEND_ORIGIN` in the backend environment if the frontend is served from a different origin.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Build and serve for production

```bash
npm run build
npm run preview
```

The production build is written to `dist/`. Configure the production web server to serve that directory and proxy `/api` requests to the backend, or set `VITE_API_URL` to a backend origin that permits the deployed frontend origin. Because Vite embeds environment values at build time, set `VITE_API_URL` before running `npm run build`.
