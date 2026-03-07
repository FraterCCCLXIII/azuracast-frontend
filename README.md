# AzuraCast Listener Frontend

Custom listener-facing frontend for AzuraCast, built with Next.js, TypeScript, Tailwind CSS v4, and shadcn/ui.

## Stack

- Next.js 16 (App Router, standalone output)
- React 19 + TypeScript
- Tailwind CSS v4
- shadcn/ui (New York style)
- Three.js (liquid gradient background)

## Features

- Now Playing card with artwork and elapsed/duration progress bar
- Play/Pause with station stream URL
- Recent tracks list from `song_history`
- Song request modal with search and pagination
- Polling-based metadata refresh with graceful error states
- Liquid animated gradient background

---

## Deployment on Coolify

This app is designed for deployment as a standalone Docker container on [Coolify](https://coolify.io).

### 1. Add the repository

In Coolify, create a new **Application** and point it at this repository. Select **Dockerfile** as the build pack.

### 2. Set environment variables

In the Coolify application settings under **Environment Variables**, add the following:

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_AZURACAST_BASE_URL` | Full URL of your AzuraCast instance (no trailing slash) | `https://radio.example.com` |
| `NEXT_PUBLIC_AZURACAST_STATION_SHORT_NAME` | Station shortcode to display by default | `my_station` |
| `NEXT_PUBLIC_FORCE_WHITE_TEXT` | Force light text (set `true` for always-dark backgrounds) | `false` |

> **Note on `NEXT_PUBLIC_` variables:** Because Next.js inlines these at build time, they must be set as **Build Variables** in Coolify (not just runtime env vars). In the Coolify UI, mark each one as available during the build step.

### 3. Configure the port

Set the container port to **3000** in your Coolify service settings.

### 4. Deploy

Trigger a deployment. Coolify will run the multi-stage Docker build and start the container.

---

## Local Development

```bash
# 1. Copy env template
cp .env.example .env.local

# 2. Edit .env.local with your AzuraCast URL and station shortcode
# NEXT_PUBLIC_AZURACAST_BASE_URL=http://localhost
# NEXT_PUBLIC_AZURACAST_STATION_SHORT_NAME=your_station

# 3. Install and run
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Local Docker Build

```bash
docker build \
  --build-arg NEXT_PUBLIC_AZURACAST_BASE_URL=https://radio.example.com \
  --build-arg NEXT_PUBLIC_AZURACAST_STATION_SHORT_NAME=my_station \
  --build-arg NEXT_PUBLIC_FORCE_WHITE_TEXT=false \
  -t azuracast-listener .

docker run -p 3000:3000 azuracast-listener
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_AZURACAST_BASE_URL` | Yes | `http://127.0.0.1` | Base URL of your AzuraCast server |
| `NEXT_PUBLIC_AZURACAST_STATION_SHORT_NAME` | No | *(first station)* | Default station shortcode |
| `NEXT_PUBLIC_FORCE_WHITE_TEXT` | No | `false` | Force white text on dark backgrounds |

---

## API Proxy

All AzuraCast API calls are routed through the Next.js API route at `/api/azuracast/[...path]`, which proxies to `NEXT_PUBLIC_AZURACAST_BASE_URL`. This avoids CORS issues when the listener frontend is served from a different domain than AzuraCast.

## Validation

```bash
npm run lint
npm run build
```
