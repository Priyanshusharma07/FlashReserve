# FlashReserve Production Deployment Guide

This guide outlines the production deployment strategy for FlashReserve, an atomic, high-concurrency flash sale inventory reservation engine.

---

## Architecture Overview

```
                                      [ Cloudflare / Route 53 ]
                                                  │
                      ┌───────────────────────────┴───────────────────────────┐
                      ▼                                                       ▼
            [ Frontend (SPA) ]                                       [ Backend API Engine ]
           Hosted on Vercel/Nginx                                   NestJS + Fastify (:3000)
                      │                                                       │
                      │ (HTTP / PASETO)                                       │
                      └───────────────────────────────┐                       │
                                                      ▼                       ▼
                                            [ Redis 7 Cluster ]  ◄──  Atomic Lua Scripts
                                            - stream:reservations
                                            - stock:counters
                                                      │
                                                      ▼ (XREADGROUP)
                                            [ Stream Worker ]
                                            NestJS Worker (:3001)
                                                      │
                                                      ▼ (Batch Upsert)
                                            [ PostgreSQL 16+ ]
                                            Aiven Cloud DB
```

---

## Deployment Option 1: Managed Cloud (Recommended)

Fastest path to production with zero server maintenance.

### 1. Frontend (`apps/frontend`) $\rightarrow$ **Vercel** or **Cloudflare Pages**
1. Connect your GitHub repository to Vercel.
2. Set **Root Directory** to `apps/frontend`.
3. Set **Framework Preset** to `Vite`.
4. Configure Build Settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Set Environment Variable:
   - `VITE_API_URL`: `https://api.yourdomain.com` (your deployed backend URL)

### 2. Backend API & Worker (`apps/backend`) $\rightarrow$ **Railway** or **Render**
Deploy two instances using the included root `Dockerfile`:

* **Service 1: API Engine (HTTP)**:
  - **Docker context**: Root repo `.`
  - **Dockerfile**: `apps/backend/Dockerfile`
  - **Environment Variables**:
    ```ini
    NODE_ENV=production
    APP_MODE=api
    PORT=3000
    DATABASE_URL=postgresql://... (Aiven PostgreSQL)
    REDIS_URL=redis://... (Upstash or Redis Cloud)
    PASETO_SECRET_KEY=k4.local.<64_char_secret>
    ```

* **Service 2: Background Worker (Consumer & Sweeper)**:
  - **Docker context**: Root repo `.`
  - **Dockerfile**: `apps/backend/Dockerfile`
  - **Environment Variables**:
    ```ini
    NODE_ENV=production
    APP_MODE=worker
    PORT=3001
    DATABASE_URL=postgresql://... (Aiven PostgreSQL)
    REDIS_URL=redis://... (Upstash or Redis Cloud)
    REDIS_STREAM_NAME=stream:reservations
    REDIS_CONSUMER_GROUP=flash_workers_group
    WORKER_CONSUMER_NAME=worker-node-1
    ```

### 3. Databases
* **PostgreSQL**: Your existing **Aiven PostgreSQL** is already hosted in the cloud.
* **Redis**: Use **Upstash Redis** or **Redis Cloud (AWS / GCP)** with `maxmemory-policy: noeviction` so stock counters are never purged.

---

## Deployment Option 2: All-in-One Docker Compose (VPS / Server)

Run the entire stack on any Linux server (AWS EC2, DigitalOcean Droplet, Hetzner) using Docker.

### 1. Clone & Configure
```bash
git clone https://github.com/Priyanshusharma07/FlashReserve.git
cd FlashReserve
cp deploy/.env.production.example .env
```

### 2. Launch Stack
```bash
docker compose up -d --build
```

This launches:
* **`flashreserve_frontend`**: Nginx serving the Vite build on port `80`.
* **`flashreserve_api`**: Fastify API on port `3000`.
* **`flashreserve_worker`**: Stream consumer worker syncing Redis $\rightarrow$ Postgres.
* **`flashreserve_redis`**: Redis 7 Alpine with persistent append-only storage.
* **`flashreserve_postgres`**: PostgreSQL 16 Alpine container.

### 3. Verification
```bash
# Verify all containers are running
docker compose ps

# Check API health
curl http://localhost:3000/health/ready
```

---

## Production Security Checklist

- [ ] **PASETO Secret Key**: Generate a cryptographically secure 64-character random key (`crypto.randomBytes(32).toString('hex')`). Never use development test keys in production.
- [ ] **CORS Origins**: Ensure `apps/backend/src/main.ts` restricts origins to your production frontend domain (e.g. `https://flashreserve.io`).
- [ ] **Redis Eviction Policy**: Configure `maxmemory-policy noeviction` in Redis so keys with TTL are not evicted prematurely.
- [ ] **SSL / TLS**: Ensure all traffic is encrypted with HTTPS via Let's Encrypt or Cloudflare SSL.
