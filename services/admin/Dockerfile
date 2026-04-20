# ── Stage: dev ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS dev
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev"]

# ── Stage: builder ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# ── Stage: prod (nginx static + proxy) ────────────────────────────────────────
FROM nginx:1.27-alpine AS prod

COPY --from=builder /app/dist /usr/share/nginx/html
# nginx image auto-runs envsubst on *.template files at startup
# → resolves $BACKEND_URL and writes to /etc/nginx/conf.d/default.conf
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
