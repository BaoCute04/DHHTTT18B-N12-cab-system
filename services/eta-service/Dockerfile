FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY services/eta-service/package.json services/eta-service/package.json
COPY platform platform
COPY services/eta-service services/eta-service

RUN npm ci --workspace @cab/eta-service --include-workspace-root

WORKDIR /app/services/eta-service

ENV PORT=3110

CMD ["npm", "run", "start"]