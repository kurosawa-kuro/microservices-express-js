FROM node:18-slim

# 必要なパッケージをインストール
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --prefer-offline --no-audit --no-fund

# Copy source code
COPY . .

# Shared directory will be mounted via docker-compose volumes

EXPOSE 9010

CMD ["npm", "run", "dev"]
