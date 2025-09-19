# Stage 1: build static assets
FROM node:20-alpine AS builder

WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH

COPY package*.json ./
RUN npm ci --silent

COPY . .
RUN npm run build

# Stage 2: serve with nginx
FROM nginx:1.25-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# copy a minimal custom nginx config to enable SPA routing
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget --spider --quiet http://127.0.0.1:3000 || exit 1

CMD ["nginx", "-g", "daemon off;"]