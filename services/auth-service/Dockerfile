FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY services/auth-service/package.json services/auth-service/package.json
COPY platform platform
COPY services/auth-service services/auth-service

RUN npm ci --workspace @cab/auth-service --include-workspace-root

WORKDIR /app/services/auth-service

ENV PORT=3104

CMD ["npm", "run", "start"]
