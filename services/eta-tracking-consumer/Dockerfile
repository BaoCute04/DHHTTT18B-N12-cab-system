FROM node:22-alpine

WORKDIR /app

# Copy workspace manifests and service source from monorepo root context
COPY package.json package-lock.json ./
COPY services/eta-tracking-consumer/package.json services/eta-tracking-consumer/package.json
COPY services/eta-tracking-consumer services/eta-tracking-consumer

# Install only the consumer workspace dependencies
RUN npm install --workspace @cab/eta-tracking-consumer --include-workspace-root

WORKDIR /app/services/eta-tracking-consumer

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('OK')" || exit 1

# Start consumer
CMD ["npm", "start"]
