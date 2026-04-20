FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY AI/ML/eta-service/package.json AI/ML/eta-service/package.json
COPY AI/ML/eta-service AI/ML/eta-service

RUN npm ci --workspace @cab/eta-service --include-workspace-root

WORKDIR /app/AI/ML/eta-service

ENV PORT=3110

CMD ["npm", "run", "start"]
