FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY services/payment-service/package.json services/payment-service/package.json
COPY platform platform
COPY services/payment-service services/payment-service

RUN npm ci --workspace @cab/payment-service --include-workspace-root

WORKDIR /app/services/payment-service

ENV PORT=3102

CMD ["npm", "run", "start"]
