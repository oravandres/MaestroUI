# syntax=docker/dockerfile:1
FROM --platform=$BUILDPLATFORM node:22.12-alpine AS builder

WORKDIR /src

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

ARG VITE_MAESTRO_API_BASE_URL=
ENV VITE_MAESTRO_API_BASE_URL=${VITE_MAESTRO_API_BASE_URL}

COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.29.4-alpine

ENV MAESTRO_API_PROXY_TARGET=http://localhost:8002

COPY deploy/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --chmod=755 deploy/10-require-maestro-api-key.sh /docker-entrypoint.d/10-require-maestro-api-key.sh
COPY --from=builder /src/dist /usr/share/nginx/html

EXPOSE 8080
