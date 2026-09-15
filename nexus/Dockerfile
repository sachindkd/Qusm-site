FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=optional
COPY . .
CMD ["npm", "run", "worker"]
