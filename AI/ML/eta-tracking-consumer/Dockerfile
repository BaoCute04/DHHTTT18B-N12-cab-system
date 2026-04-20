FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY AI/ML/eta-tracking-consumer/package.json AI/ML/eta-tracking-consumer/package.json
COPY AI/ML/eta-tracking-consumer AI/ML/eta-tracking-consumer

RUN npm ci --workspace @cab/eta-tracking-consumer --include-workspace-root

WORKDIR /app/AI/ML/eta-tracking-consumer

CMD ["npm", "run", "start"]
