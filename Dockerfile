# syntax=docker/dockerfile:1
FROM --platform=$BUILDPLATFORM node:22.12-alpine AS builder

WORKDIR /src

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

ARG VITE_MAESTRO_API_BASE_URL=https://maestro.mimi.local
ENV VITE_MAESTRO_API_BASE_URL=${VITE_MAESTRO_API_BASE_URL}
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.29.4-alpine

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /src/dist /usr/share/nginx/html

EXPOSE 8080
