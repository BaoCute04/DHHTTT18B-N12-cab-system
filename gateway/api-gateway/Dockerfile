FROM node:18-alpine
WORKDIR /app
COPY gateway/api-gateway/package.json ./
RUN npm install --omit=dev
COPY gateway/api-gateway/ .
COPY platform /platform
CMD ["node", "./bin/www"]
