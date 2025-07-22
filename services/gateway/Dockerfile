FROM node:18-slim

# 必要なパッケージをインストール
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Configure npm for better network handling
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 60000

# Copy package files
COPY package*.json ./
RUN npm ci --prefer-offline --no-audit --no-fund

# Copy source code
COPY . .

# Shared directory will be mounted via docker-compose volumes

EXPOSE 8072

CMD ["npm", "run", "dev"]
