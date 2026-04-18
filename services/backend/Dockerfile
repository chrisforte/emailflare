# ── Stage: dev ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS dev
WORKDIR /app

RUN npm install -g tsx

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["tsx", "watch", "src/index.ts"]

# ── Stage: builder ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# ── Stage: prod ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS prod
WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/index.js"]
