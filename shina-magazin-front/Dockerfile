# Frontend (Vite + React) -> nginx static — Coolify Dockerfile deploy.
# nginx /api'ni backend'ga proxy qiladi (same-origin) + SPA history fallback.

# --- Build ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# OG/Twitter va sitemap ABSOLYUT URL uchun (bo'sh = relativ). Coolify'da build-arg bering:
#   VITE_SITE_URL=https://<domen>
ARG VITE_SITE_URL=
ENV VITE_SITE_URL=$VITE_SITE_URL
RUN npm run build

# --- Run (nginx) ---
FROM nginx:1.27-alpine AS run
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
