FROM node:20-alpine

WORKDIR /app

COPY package.json ./package.json
COPY api-gateway/package.json ./api-gateway/package.json
COPY services/uno-service/package.json ./services/uno-service/package.json
COPY services/cards-service/package.json ./services/cards-service/package.json
COPY services/chess-service/package.json ./services/chess-service/package.json
COPY services/snakes-service/package.json ./services/snakes-service/package.json
RUN npm install --workspaces

COPY . .

WORKDIR /app/services/snakes-service
