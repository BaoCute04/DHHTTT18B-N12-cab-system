Project-BookingCab - Microservices Template

This repository is a lightweight scaffold for a ride-hailing microservices system. The layout follows the team's recommended structure.

Quick start (requires Docker & Docker Compose):

```bash
docker-compose up --build
```

Top-level layout:
- apps/ - frontend apps (customer, driver, admin)
- services/ - backend microservices (api-gateway + services)
- packages/ - shared code (common, events)
- infrastructure/ - docker, k8s, scripts

Services included (templates under `services/`):
- api-gateway
- auth-service
- user-service
- booking-service
- driver-service
- ride-service
- pricing-service
- payment-service
- review-service
- notification-service

Each service is a minimal Node.js + Express app with a `Dockerfile` and `package.json`.

To run a single service locally (example: `auth-service`):

```bash
cd services/auth-service
npm install
npm start
```

Files to check:
- [docker-compose.yml](docker-compose.yml)
- [services/api-gateway/index.js](services/api-gateway/index.js)
- [packages/events/index.js](packages/events/index.js)

See `infrastructure/docker/docker-compose.dev.yml` for a developer compose that includes infra services.
