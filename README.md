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
| `NEXT_PUBLIC_AZURACAST_BASE_URL` | Full URL of your AzuraCast instance (no trailing slash) | `https://stream.example.com` |
| `NEXT_PUBLIC_AZURACAST_STATION_SHORT_NAME` | Station shortcode to display by default | `my_station` |
| `NEXT_PUBLIC_FORCE_WHITE_TEXT` | Force light text (set `true` for always-dark backgrounds) | `false` |

> **Note on `NEXT_PUBLIC_` variables:** Because Next.js inlines these at build time, they must be set before the build runs. In Coolify's Environment Variables UI, add them and then trigger a full **Redeploy** (not just Restart) so the Docker build picks them up.

### 3. Configure the port

Set the container port to **3000** in your Coolify service settings.

### 4. Deploy

Trigger a deployment. Coolify will run the multi-stage Docker build and start the container.

---

## AzuraCast Port Configuration (Shared Server)

When AzuraCast and Coolify share the same server, the default AzuraCast ports conflict with Coolify. Ports must be customised during the AzuraCast installation wizard.

### Installation

```bash
cd /opt/azuracast
./docker.sh install
```

When the wizard asks **"Customize ports used for AzuraCast?"**, answer `yes`.

### Wizard answers

**Web interface ports** — changed to avoid conflict with Coolify's proxy on 80/443:

| Prompt | Default | Used |
|---|---|---|
| HTTP Port | `80` | `8081` |
| HTTPS Port | `443` | `8444` |

**SFTP port** — left as default:

| Prompt | Default | Used |
|---|---|---|
| SFTP Port | `2022` | `2022` |

**Station broadcasting ports** — changed to avoid conflict with Coolify's dashboard on 8000:

| Prompt | Default | Used |
|---|---|---|
| Broadcasting port range | `8000–8499` | `9000–9499` |

### Resulting port layout

| Service | Port |
|---|---|
| AzuraCast Web UI (HTTP) | `8081` |
| AzuraCast Web UI (HTTPS) | `8444` |
| SFTP | `2022` |
| Station streams | `9000–9499` |

### Station configuration

Inside the AzuraCast UI, set **Customize Broadcasting Port** on each station to a port in the `9000–9499` range. For example, station `tiru` uses port `9000`, making its raw stream available at:

```
http://<SERVER_IP>:9000/stream
```

### Verifying ports

```bash
docker ps | grep azuracast
```

Expected output includes:

```
0.0.0.0:8081->8081/tcp
0.0.0.0:8444->8444/tcp
0.0.0.0:9000->9000/tcp
```

### Changing ports later

Ports are written to the AzuraCast `.env` file generated during install. To change them, either rerun the installer:

```bash
./docker.sh install
```

or edit `/opt/azuracast/.env` directly and restart the stack.

---

## Connecting to AzuraCast on the Same Server (Hetzner / shared host)

If Coolify and AzuraCast are running on the same server, AzuraCast will be on a non-standard port (e.g. `8081`) and won't have a domain or HTTPS by default. Because the listener frontend is served over HTTPS, the browser will block any HTTP requests back to AzuraCast (API calls, SSE, audio stream). You must give AzuraCast its own subdomain with HTTPS via Coolify's Traefik proxy.

### Step 1 — Add a DNS A record

In your DNS provider (e.g. Namecheap → **Advanced DNS**), add:

| Type | Host | Value |
|---|---|---|
| `A Record` | `stream` | `<your server IP>` |

Wait for DNS to propagate before continuing. You can verify with `ping stream.yourdomain.com`.

### Step 2 — Create a Traefik dynamic config in Coolify

In Coolify, go to **Servers → your server → Proxy → Dynamic Configurations** and create a new file named `azuracast.yml`:

```yaml
http:
  routers:
    azuracast:
      rule: "Host(`stream.yourdomain.com`)"
      service: azuracast
      entryPoints:
        - https
      tls:
        certResolver: letsencrypt

  services:
    azuracast:
      loadBalancer:
        servers:
          - url: "http://host.docker.internal:8081"
```

> **Note:** `localhost` inside a Docker container refers to the container itself, not the host machine. Use `host.docker.internal` so Traefik can reach AzuraCast on the host. If that doesn't resolve on your Linux host, use `http://172.17.0.1:8081` (the default Docker bridge gateway — confirm with `ip route | grep docker`).

Traefik picks up dynamic configs immediately. Let's Encrypt will issue a certificate automatically once DNS is resolving.

Verify by opening `https://stream.yourdomain.com` — you should see the AzuraCast login page over HTTPS.

### Step 3 — Set AzuraCast's Base URL

Log in to AzuraCast and go to **Administration → System Settings → Site Base URL**. Set it to:

```
https://stream.yourdomain.com
```

This is essential. AzuraCast uses this value when building the stream URLs, artwork URLs, and all other absolute links it returns in its API. Without it, the API still returns `http://<ip>:<port>/...` URLs which the browser will block as mixed content.

### Step 4 — Update the Coolify build variable

In Coolify, open the frontend app → **Environment Variables** and set:

```
NEXT_PUBLIC_AZURACAST_BASE_URL=https://stream.yourdomain.com
```

Click **Save All Environment Variables**.

### Step 5 — Redeploy

Click **Redeploy** (not Restart) to trigger a full Docker build with the new URL baked in.

### Verification checklist

- [ ] `https://stream.yourdomain.com` loads AzuraCast with a valid SSL cert
- [ ] `https://stream.yourdomain.com/listen/<shortcode>/radio.mp3` plays audio
- [ ] `https://yourdomain.com` shows now-playing info (no "Reconnecting..." badge)
- [ ] Play button streams audio without error

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
| `NEXT_PUBLIC_AZURACAST_BASE_URL` | Yes | `http://127.0.0.1` | Base URL of your AzuraCast server (no trailing slash) |
| `NEXT_PUBLIC_AZURACAST_STATION_SHORT_NAME` | No | *(first station)* | Default station shortcode |
| `NEXT_PUBLIC_FORCE_WHITE_TEXT` | No | `false` | Force white text regardless of background |
| `NEXT_PUBLIC_BACKGROUND_MODE` | No | `album-art` | Background style: `album-art` or `gradient-1` through `gradient-5` |
| `NEXT_PUBLIC_AUDIO_REACTIVE` | No | `false` | Animate gradient using Web Audio API (requires AzuraCast CORS headers) |
| `NEXT_PUBLIC_GRADIENT_CYCLE_SCHEME` | No | `false` | Cycle through gradient schemes on each song change with a crossfade |

---

## API Proxy

All AzuraCast API calls are routed through the Next.js API route at `/api/azuracast/[...path]`, which proxies to `NEXT_PUBLIC_AZURACAST_BASE_URL`. This avoids CORS issues when the listener frontend is served from a different domain than AzuraCast.

## Validation

```bash
npm run lint
npm run build
```
