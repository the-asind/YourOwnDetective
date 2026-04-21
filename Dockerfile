# ── Stage 1: Build frontend ──
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

# ── Stage 2: Production server ──
FROM node:20-alpine AS runner

WORKDIR /app

# Copy package files and install ALL deps (tsx is needed at runtime)
COPY package.json package-lock.json* ./
RUN npm install --production=false && npm cache clean --force

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy server source
COPY server ./server
COPY tsconfig.json ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npx", "tsx", "server/index.ts"]
