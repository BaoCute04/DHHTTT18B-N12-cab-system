
```
CAB-BOOKING
├─ .dockerignore
├─ apps
│  ├─ admin-dashboard
│  │  ├─ index.html
│  │  ├─ package.json
│  │  └─ src
│  │     ├─ App.jsx
│  │     └─ main.jsx
│  ├─ customer-app
│  │  ├─ index.html
│  │  ├─ package.json
│  │  └─ src
│  │     ├─ App.jsx
│  │     └─ main.jsx
│  └─ driver-app
│     ├─ index.html
│     ├─ package.json
│     └─ src
│        ├─ App.jsx
│        └─ main.jsx
├─ CAB-BOOKING-SYSTEM.docx
├─ CAB-BOOKING-SYSTEM.extracted.txt
├─ data-layer
│  ├─ mongodb
│  │  └─ ownership.json
│  ├─ postgresql
│  │  └─ ownership.json
│  └─ redis
│     ├─ geo-topology.json
│     └─ ownership.json
├─ docs
│  └─ architecture
│     ├─ 01-overall-architecture.md
│     └─ 02-deployment-architecture.md
├─ gateway
│  └─ api-gateway
│     ├─ app.js
│     ├─ bin
│     │  └─ www
│     ├─ Dockerfile
│     ├─ docs
│     │  ├─ 01-overview.md
│     │  ├─ 02-architecture.md
│     │  ├─ 03-request-lifecycle.md
│     │  ├─ 04-routing.md
│     │  ├─ 05-security-zero-trust.md
│     │  ├─ 06-middleware-chain.md
│     │  ├─ 07-rate-limit-idempotency.md
│     │  ├─ 08-realtime-websocket.md
│     │  ├─ 09-event-integration.md
│     │  ├─ 10-error-failure-handling.md
│     │  ├─ 11-observability-tracing.md
│     │  └─ 12-data-contract-validation.md
│     ├─ index.js
│     ├─ package.json
│     ├─ public
│     │  └─ stylesheets
│     │     └─ style.css
│     ├─ routes
│     │  ├─ index.js
│     │  └─ users.js
│     ├─ src
│     │  ├─ app.js
│     │  ├─ errors.js
│     │  ├─ http-response.js
│     │  ├─ index.js
│     │  ├─ logger.js
│     │  ├─ metrics.js
│     │  ├─ middleware
│     │  │  ├─ auth.js
│     │  │  ├─ authorization.js
│     │  │  ├─ error-handler.js
│     │  │  ├─ idempotency.js
│     │  │  ├─ rate-limit.js
│     │  │  ├─ request-context.js
│     │  │  ├─ response-normalization.js
│     │  │  ├─ routing.js
│     │  │  └─ validation.js
│     │  ├─ realtime
│     │  │  └─ hub.js
│     │  ├─ route-registry.js
│     │  ├─ security
│     │  │  ├─ abac.js
│     │  │  └─ jwt-service.js
│     │  ├─ server.js
│     │  ├─ services
│     │  │  ├─ circuit-breaker.js
│     │  │  └─ proxy-client.js
│     │  ├─ stores
│     │  │  ├─ index.js
│     │  │  ├─ memory-store.js
│     │  │  └─ redis-store.js
│     │  └─ validation-schemas.js
│     ├─ test
│     │  ├─ http-gateway.test.js
│     │  └─ realtime-gateway.test.js
│     └─ views
│        ├─ error.jade
│        ├─ index.jade
│        └─ layout.jade
├─ infra
│  ├─ docker-compose
│  │  └─ docker-compose.local.yml
│  └─ docker-swarm
│     ├─ autoscaling-policy.json
│     ├─ configs
│     │  └─ redis
│     │     └─ redis.conf
│     ├─ docker-stack.yml
│     ├─ scripts
│     │  ├─ deploy-stack.ps1
│     │  ├─ init-swarm.ps1
│     │  ├─ label-nodes.ps1
│     │  └─ scale-service.ps1
│     └─ swarm-architecture.mmd
├─ message-broker
│  └─ kafka
│     └─ topology.json
├─ package-lock.json
├─ package.json
├─ packages
│  └─ auth
│     ├─ index.js
│     └─ package.json
├─ PhanChiaCongViec.docx
├─ platform
│  ├─ architecture
│  │  ├─ ai-machine-learning-architecture.mmd
│  │  ├─ ai-topology.js
│  │  ├─ event-contracts.js
│  │  ├─ overall-architecture.mmd
│  │  ├─ print-ai-topology.js
│  │  ├─ print-realtime-topology.js
│  │  ├─ print-resilience-topology.js
│  │  ├─ print-security-topology.js
│  │  ├─ print-topology.js
│  │  ├─ realtime-event-architecture.mmd
│  │  ├─ realtime-topology.js
│  │  ├─ resilience-topology.js
│  │  ├─ scaling-fault-tolerance-architecture.mmd
│  │  ├─ security-topology.js
│  │  ├─ security-zero-trust-architecture.mmd
│  │  ├─ service-manifests.js
│  │  ├─ system-requirements.js
│  │  └─ topology.js
│  ├─ ml
│  │  └─ feature-store-topology.json
│  └─ node
│     ├─ ai-layer.js
│     ├─ broker.js
│     ├─ create-service-app.js
│     ├─ resilience-layer.js
│     ├─ security-layer.js
│     └─ socket-layer.js
├─ services
│  ├─ auth-service
│  │  ├─ Dockerfile
│  │  ├─ images
│  │  │  ├─ abac-active-ride-not-assigned-403.png
│  │  │  ├─ abac-completed-ride-location-403.png
│  │  │  ├─ admin-password-mfa-setup-task9.png
│  │  │  ├─ browser-cases
│  │  │  │  ├─ abac-active-ride-location-200.html
│  │  │  │  ├─ abac-completed-ride-location-403.html
│  │  │  │  ├─ admin-password-mfa-setup.html
│  │  │  │  ├─ health-auth-200.html
│  │  │  │  ├─ health-gateway-200.html
│  │  │  │  ├─ jwt-auth-me-customer-200.html
│  │  │  │  ├─ oauth-refresh-customer-200.html
│  │  │  │  ├─ oauth-revoke-200.html
│  │  │  │  ├─ oauth-token-alias-200.html
│  │  │  │  ├─ otp-customer-request-202.html
│  │  │  │  ├─ otp-customer-verify-200.html
│  │  │  │  ├─ otp-driver-request-202.html
│  │  │  │  ├─ otp-driver-verify-200.html
│  │  │  │  ├─ rbac-admin-customer-token-403.html
│  │  │  │  ├─ rbac-customer-no-token-401.html
│  │  │  │  └─ rbac-driver-token-200.html
│  │  │  ├─ health-auth-200.png
│  │  │  ├─ health-gateway-200.png
│  │  │  ├─ jwt-auth-me-customer-200.png
│  │  │  ├─ oauth-refresh-customer-200.png
│  │  │  ├─ oauth-revoke-200.png
│  │  │  ├─ oauth-token-alias-200.png
│  │  │  ├─ otp-customer-request-202.png
│  │  │  ├─ otp-customer-verify-200.png
│  │  │  ├─ otp-driver-request-202.png
│  │  │  ├─ otp-driver-verify-200.png
│  │  │  ├─ rbac-admin-customer-token-403.png
│  │  │  ├─ rbac-customer-no-token-401.png
│  │  │  ├─ rbac-driver-token-200.png
│  │  │  └─ [ABAC]-Driver-Update-Assigned-Active-Ride-200.png
│  │  ├─ index.js
│  │  ├─ openapi.yaml
│  │  ├─ package-lock.json
│  │  ├─ package.json
│  │  ├─ postman
│  │  │  ├─ auth-service-local.postman_environment.json
│  │  │  ├─ auth-service-mvp-dry-run-checklist.md
│  │  │  ├─ auth-service-mvp.postman_collection.json
│  │  │  ├─ run-newman-happy-path.ps1
│  │  │  └─ _runtime-env.json
│  │  ├─ Restore.md
│  │  ├─ scripts
│  │  │  └─ dry-run-with-html.mjs
│  │  ├─ sql
│  │  │  └─ schema.sql
│  │  ├─ src
│  │  │  ├─ app.js
│  │  │  ├─ config
│  │  │  │  ├─ env.js
│  │  │  │  └─ security.js
│  │  │  ├─ controllers
│  │  │  │  ├─ admin-auth.controller.js
│  │  │  │  ├─ jwks.controller.js
│  │  │  │  ├─ otp-auth.controller.js
│  │  │  │  └─ session.controller.js
│  │  │  ├─ index.js
│  │  │  ├─ lib
│  │  │  │  ├─ jwt.js
│  │  │  │  ├─ password.js
│  │  │  │  ├─ postgres.js
│  │  │  │  ├─ redis.js
│  │  │  │  └─ totp.js
│  │  │  ├─ middleware
│  │  │  │  ├─ auth-rate-limit.middleware.js
│  │  │  │  ├─ error-handler.middleware.js
│  │  │  │  ├─ request-id.middleware.js
│  │  │  │  └─ validation.middleware.js
│  │  │  ├─ repositories
│  │  │  │  ├─ admin-credentials.repository.js
│  │  │  │  ├─ audit.repository.js
│  │  │  │  ├─ auth-accounts.repository.js
│  │  │  │  ├─ refresh-tokens.repository.js
│  │  │  │  └─ sessions.repository.js
│  │  │  ├─ routes
│  │  │  │  ├─ admin-auth.routes.js
│  │  │  │  ├─ jwks.routes.js
│  │  │  │  ├─ public-auth.routes.js
│  │  │  │  └─ session.routes.js
│  │  │  ├─ schemas
│  │  │  │  ├─ admin-auth.schema.js
│  │  │  │  ├─ otp.schema.js
│  │  │  │  └─ session.schema.js
│  │  │  ├─ server.js
│  │  │  └─ services
│  │  │     ├─ admin-auth.service.js
│  │  │     ├─ admin-bootstrap.service.js
│  │  │     ├─ audit.service.js
│  │  │     ├─ bootstrap.service.js
│  │  │     ├─ mfa.service.js
│  │  │     ├─ notification-client.service.js
│  │  │     ├─ otp-auth.service.js
│  │  │     ├─ session.service.js
│  │  │     └─ token.service.js
│  │  └─ test
│  │     └─ dependency-plan.test.js
│  ├─ booking-service
│  │  ├─ Dockerfile
│  │  ├─ image-1.png
│  │  ├─ image-2.png
│  │  ├─ image-3.png
│  │  ├─ image-4.png
│  │  ├─ image-5.png
│  │  ├─ image-6.png
│  │  ├─ image-7.png
│  │  ├─ image.png
│  │  ├─ package.json
│  │  ├─ readme.md
│  │  └─ src
│  │     ├─ controllers
│  │     │  └─ bookingController.js
│  │     ├─ index.js
│  │     ├─ models
│  │     │  └─ Booking.js
│  │     ├─ routes
│  │     │  └─ bookingRoutes.js
│  │     └─ utils
│  │        └─ messageBroker.js
│  ├─ driver-service
│  │  ├─ Dockerfile
│  │  ├─ MONGODB_INTEGRATION.md
│  │  ├─ package.json
│  │  ├─ POSTMAN_TESTS.md
│  │  └─ src
│  │     ├─ controllers
│  │     │  └─ driverController.js
│  │     ├─ img
│  │     │  ├─ Screenshot 2026-04-08 225202.png
│  │     │  ├─ Screenshot 2026-04-08 234253.png
│  │     │  ├─ Screenshot 2026-04-08 234349.png
│  │     │  ├─ Screenshot 2026-04-08 234418.png
│  │     │  ├─ Screenshot 2026-04-08 234503.png
│  │     │  ├─ Screenshot 2026-04-08 234606.png
│  │     │  ├─ Screenshot 2026-04-08 234737.png
│  │     │  ├─ Screenshot 2026-04-08 234844.png
│  │     │  └─ Screenshot 2026-04-08 235116.png
│  │     ├─ index.js
│  │     ├─ models
│  │     │  └─ Driver.js
│  │     ├─ routes
│  │     │  └─ index.js
│  │     └─ utils
│  │        └─ index.js
│  ├─ notification-service
│  │  ├─ Dockerfile
│  │  ├─ package.json
│  │  ├─ src
│  │  │  ├─ app.js
│  │  │  ├─ channel-dispatcher.js
│  │  │  ├─ event-mapper.js
│  │  │  ├─ index.js
│  │  │  ├─ kafka-consumer.js
│  │  │  ├─ load-env.js
│  │  │  ├─ notification-repository.js
│  │  │  └─ notification-service.js
│  │  └─ test
│  │     └─ notification-service.test.js
│  ├─ payment-service
│  │  ├─ Dockerfile
│  │  ├─ index.js
│  │  ├─ package.json
│  │  ├─ src
│  │  │  ├─ app.js
│  │  │  ├─ config
│  │  │  │  ├─ constants.js
│  │  │  │  └─ env.js
│  │  │  ├─ controllers
│  │  │  │  └─ paymentController.js
│  │  │  ├─ db
│  │  │  │  └─ mongoClient.js
│  │  │  ├─ index.js
│  │  │  ├─ middlewares
│  │  │  │  ├─ errorHandler.js
│  │  │  │  ├─ notFound.js
│  │  │  │  └─ requestMeta.js
│  │  │  ├─ models
│  │  │  │  └─ paymentModel.js
│  │  │  ├─ repositories
│  │  │  │  └─ paymentRepository.js
│  │  │  ├─ routes
│  │  │  │  └─ paymentRoutes.js
│  │  │  ├─ server.js
│  │  │  ├─ services
│  │  │  │  ├─ paymentService.js
│  │  │  │  └─ paymentStore.js
│  │  │  └─ utils
│  │  │     ├─ ids.js
│  │  │     ├─ response.js
│  │  │     ├─ time.js
│  │  │     └─ validation.js
│  │  └─ testPM
│  │     ├─ Get.png
│  │     ├─ MongoDB.png
│  │     ├─ Post-confirm.png
│  │     ├─ Post-create.png
│  │     └─ Post-Refund.png
│  ├─ pricing-service
│  │  ├─ Dockerfile
│  │  ├─ images
│  │  │  ├─ Chịu crash hệ thống khi cung = 0 .png
│  │  │  ├─ Cầu bé hơn Cung set surge = 1.png
│  │  │  ├─ Cầu lớn hơn Cung.png
│  │  │  ├─ Kiểm tra dữ liệu không hợp lệ.png
│  │  │  └─ Success_Cung Cầu = nhau.png
│  │  ├─ package.json
│  │  └─ src
│  │     ├─ controllers
│  │     │  └─ pricingController.js
│  │     ├─ index.js
│  │     ├─ models
│  │     │  ├─ PricingRule.js
│  │     │  └─ SurgeZone.js
│  │     ├─ routes
│  │     │  └─ pricingRoutes.js
│  │     └─ utils
│  │        └─ logger.js
│  ├─ review-service
│  │  ├─ Dockerfile
│  │  ├─ package.json
│  │  ├─ POSTMAN_TEST_GUIDE.md
│  │  ├─ review_service_summary.md.resolved
│  │  └─ src
│  │     ├─ index.js
│  │     ├─ routes.js
│  │     └─ store.js
│  ├─ ride-service
│  │  ├─ Dockerfile
│  │  ├─ docs
│  │  │  ├─ API.md
│  │  │  ├─ ARCHITECTURE.md
│  │  │  ├─ DELIVERABLES.md
│  │  │  ├─ INDEX.md
│  │  │  ├─ INTEGRATION.md
│  │  │  ├─ QUICKSTART.md
│  │  │  └─ SRC_STRUCTURE.md
│  │  ├─ index.js
│  │  ├─ package.json
│  │  ├─ README.md
│  │  ├─ src
│  │  │  ├─ app.js
│  │  │  ├─ controllers
│  │  │  │  └─ ride.controller.js
│  │  │  ├─ database
│  │  │  │  └─ mongoose.js
│  │  │  ├─ models
│  │  │  │  ├─ ride.model.js
│  │  │  │  └─ ride.mongo.model.js
│  │  │  ├─ realtime
│  │  │  │  └─ socket.js
│  │  │  ├─ routes
│  │  │  │  └─ ride.routes.js
│  │  │  └─ services
│  │  │     ├─ eta.service.js
│  │  │     ├─ location.service.js
│  │  │     └─ ride.service.js
│  │  └─ test.js
│  └─ user-service
│     ├─ Dockerfile
│     ├─ package.json
│     ├─ sql
│     │  └─ schema.sql
│     └─ src
│        ├─ app.js
│        ├─ config.js
│        ├─ domain
│        │  └─ user-constants.js
│        ├─ index.js
│        ├─ lib
│        │  ├─ api-error.js
│        │  ├─ async-handler.js
│        │  ├─ request-context.js
│        │  └─ response.js
│        ├─ middleware
│        │  └─ error-handler.js
│        ├─ repositories
│        │  ├─ create-user-repository.js
│        │  ├─ in-memory-user-repository.js
│        │  └─ postgres-user-repository.js
│        ├─ routes
│        │  └─ user-routes.js
│        ├─ schemas
│        │  └─ user-schemas.js
│        └─ services
│           └─ user-domain-service.js
├─ so khớp in_output.docx
├─ Tiến độ.docx
├─ ~$ khớp in_output.docx
└─ ~$B-BOOKING-SYSTEM.docx

```