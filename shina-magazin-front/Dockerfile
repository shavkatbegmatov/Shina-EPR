# ========== BUILD STAGE ==========
FROM node:20-alpine AS build
WORKDIR /app

# Dependency'lar (cache qatlami uchun)
COPY package.json package-lock.json ./
RUN npm ci

# Source + build. OG/Twitter va sitemap ABSOLYUT URL uchun VITE_SITE_URL build-arg
# (bo'sh = relativ). Coolify build-arg: VITE_SITE_URL=https://<domen>
COPY . .
ARG VITE_SITE_URL=
ENV VITE_SITE_URL=$VITE_SITE_URL
RUN npm run build

# ========== RUN STAGE ==========
FROM nginx:alpine
# Template startupda envsubst bilan /etc/nginx/conf.d/default.conf ga aylanadi
# (rasmiy image mexanizmi) — backend host/port'ni env orqali moslash mumkin.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
ENV BACKEND_HOST=shina-magazin-api \
    BACKEND_PORT=8183
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
