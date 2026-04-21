FROM node:20-alpine

WORKDIR /app

# Copy AI/ML eta-service package.json
COPY AI/ML/eta-service/package.json ./AI/ML/eta-service/

# Install dependencies
WORKDIR /app/AI/ML/eta-service
RUN npm install --omit=dev

# Copy source
WORKDIR /app
COPY AI/ML/eta-service/src ./AI/ML/eta-service/src

WORKDIR /app/AI/ML/eta-service

CMD ["node", "src/eta.service.js"]
