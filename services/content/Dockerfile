FROM node:18-slim

# 必要なパッケージをインストール
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY shared/ ./shared/
COPY services/content/package*.json ./services/content/

RUN cd services/content && npm ci --prefer-offline --no-audit --no-fund

COPY services/content/ ./services/content/

WORKDIR /app/services/content

RUN npx prisma generate

EXPOSE 8088

CMD ["npm", "start"]
