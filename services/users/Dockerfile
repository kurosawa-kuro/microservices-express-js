FROM node:18-slim

# 必要なパッケージをインストール
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY shared/ ./shared/
COPY services/users/package*.json ./services/users/

RUN cd services/users && npm ci --prefer-offline --no-audit --no-fund

COPY services/users/ ./services/users/

WORKDIR /app/services/users

RUN npx prisma generate

EXPOSE 8082

CMD ["npm", "start"]
