FROM node:18-slim

# 必要なパッケージをインストール
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY services/payments/package*.json ./services/payments/
COPY shared/ ./shared/

WORKDIR /app/services/payments

# Configure npm for better network handling
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 60000

RUN npm ci --prefer-offline --no-audit --no-fund

COPY services/payments/ .

EXPOSE 8086

CMD ["npm", "start"]
