FROM node:20-slim AS builder

WORKDIR /app

# Copy all source files
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the app (vite build + esbuild server)
RUN npm run build

# --- Production Stage ---
FROM node:20-slim

WORKDIR /app

# Copy package files and install production deps only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built output from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Copy runtime data files
COPY news_database.json ./
COPY restricted_channels_db.json ./
COPY user_profiles_db.json ./
COPY .env.example ./.env

EXPOSE 8080

CMD ["node", "dist/server.cjs"]
