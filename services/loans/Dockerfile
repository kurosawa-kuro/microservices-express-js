FROM node:21-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Shared directory will be mounted via docker-compose volumes

# Create data directory for SQLite
RUN mkdir -p data

EXPOSE 8090

CMD ["npm", "run", "dev"]
