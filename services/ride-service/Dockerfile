FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY services/ride-service/package.json services/ride-service/package.json
COPY platform platform
COPY services/ride-service services/ride-service

RUN npm ci --workspace @cab/ride-service --include-workspace-root

WORKDIR /app/services/ride-service

ENV PORT=3109

CMD ["npm", "run", "start"]
