FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY web_studio/package*.json ./web_studio/
RUN npm install --omit=dev --no-audit

# Copy all application assets and pre-built bundles
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server.cjs"]
