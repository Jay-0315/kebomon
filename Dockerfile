FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY apps/user-web/package.json ./apps/user-web/package.json

RUN npm install

COPY . .

WORKDIR /app/apps/user-web

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
