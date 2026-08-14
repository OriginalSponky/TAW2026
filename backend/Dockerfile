FROM node:20-alpine

LABEL authors="cioff"

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]


