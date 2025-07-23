FROM node:18-slim

# 必要なパッケージをインストール
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY shared/ ./shared/
COPY services/analytics/package*.json ./services/analytics/

RUN cd services/analytics && npm ci --prefer-offline --no-audit --no-fund

COPY services/analytics/ ./services/analytics/

WORKDIR /app/services/analytics

RUN npx prisma generate

EXPOSE 8087

CMD ["npm", "start"]
