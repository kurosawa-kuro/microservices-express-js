FROM node:18-alpine

WORKDIR /app

COPY services/orders/package*.json ./services/orders/
COPY shared/ ./shared/

WORKDIR /app/services/orders

RUN npm install

COPY services/orders/ .

EXPOSE 8085

CMD ["npm", "start"]
