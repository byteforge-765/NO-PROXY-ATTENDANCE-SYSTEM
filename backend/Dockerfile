FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN mkdir -p src/uploads/photos src/uploads/study-material
EXPOSE 5001
CMD ["node", "src/app.js"]
