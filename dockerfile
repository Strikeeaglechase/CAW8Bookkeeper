FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --include=dev

COPY tsconfig.json ./
COPY src/ ./src/
COPY ops.json ./
COPY CAWLOGO.png ./
RUN npm run build

EXPOSE 8011

CMD ["npm", "start"]