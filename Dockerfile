# Production Dockerfile for AI News Maker Full-Stack Web App on Cloud Run
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies safely even if package-lock is omitted
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts

# Copy pre-compiled server, web client assets, and config
COPY server.cjs ./
COPY dev.cjs ./
COPY public ./public

# Ensure dist exists inside container by copying public assets to dist if dist is not present
COPY public ./dist

COPY firebase-applet-config.json ./

# Copy server firestore adapter into both root and web_studio for reliable module resolution
COPY web_studio/server_firestore_adapter.cjs ./web_studio/server_firestore_adapter.cjs
COPY web_studio/server_firestore_adapter.cjs ./server_firestore_adapter.cjs

# Copy fallback schema databases
COPY news_database.json ./
COPY rss_sources_database.json ./
COPY drafts_database.json ./
COPY user_profiles_db.json ./

EXPOSE 3000

# Cloud Run invokes the standard entry point
CMD ["node", "server.cjs"]
