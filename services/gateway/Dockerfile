FROM node:21-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Shared directory will be mounted via docker-compose volumes

EXPOSE 8072

CMD ["npm", "run", "dev"]
