FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY shared/ ./shared/
COPY services/auth/package*.json ./services/auth/

RUN cd services/auth && npm install

COPY services/auth/ ./services/auth/

WORKDIR /app/services/auth

RUN npx prisma generate

EXPOSE 8081

CMD ["npm", "start"]
