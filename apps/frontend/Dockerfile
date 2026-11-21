# Multi-stage Dockerfile for FlashReserve Frontend (Vite SPA)
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json turbo.json ./
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY apps/frontend/package*.json ./apps/frontend/

RUN npm install --legacy-peer-deps

COPY packages/shared-types/ ./packages/shared-types/
RUN npm run --workspace=@flashreserve/shared-types build

COPY apps/frontend/ ./apps/frontend/

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run --workspace=@flashreserve/frontend build

# Production Nginx Stage
FROM nginx:alpine AS runner

COPY --from=builder /usr/src/app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
