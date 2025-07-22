FROM node:18-alpine

WORKDIR /app

COPY services/orders/package*.json ./services/orders/
COPY shared/ ./shared/

WORKDIR /app/services/orders

# Configure npm for better network handling
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 60000

RUN npm ci --prefer-offline --no-audit --no-fund

COPY services/orders/ .

EXPOSE 8085

CMD ["npm", "start"]
