FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY shared/ ./shared/
COPY services/users/package*.json ./services/users/

RUN cd services/users && npm install

COPY services/users/ ./services/users/

WORKDIR /app/services/users

RUN npx prisma generate

EXPOSE 8082

CMD ["npm", "start"]
