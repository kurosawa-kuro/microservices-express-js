FROM node:18-alpine

WORKDIR /app

COPY services/products/package*.json ./services/products/
COPY shared/ ./shared/

WORKDIR /app/services/products

RUN npm install

COPY services/products/ .

EXPOSE 8083

CMD ["npm", "start"]
