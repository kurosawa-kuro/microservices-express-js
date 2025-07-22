FROM node:18-alpine

WORKDIR /app

COPY services/cart/package*.json ./services/cart/
COPY shared/ ./shared/

WORKDIR /app/services/cart

RUN npm install

COPY services/cart/ .

EXPOSE 8084

CMD ["npm", "start"]
