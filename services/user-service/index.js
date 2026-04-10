const crypto = require('crypto');
const express = require('express');
const { createRequireAuth, createRequireRole } = require('@cab/auth');
const { buildForwardedAuthContext } = require('./src/auth-context');

const requestIdHeader = process.env.REQUEST_ID_HEADER || 'x-request-id';
const customerProfilesBySubjectId = new Map();
const AUTH_JWKS_URI =
    process.env.AUTH_JWKS_URI || 'http://auth-service:3000/.well-known/jwks.json';
const AUTH_JWT_ISSUER = process.env.AUTH_JWT_ISSUER || 'cab-auth-service';
const AUTH_JWT_AUDIENCE = (process.env.AUTH_JWT_AUDIENCE || 'cab-api')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

function createApp() {
    const app = express();
    const requireAuth = createRequireAuth({
        jwksUri: AUTH_JWKS_URI,
        issuer: AUTH_JWT_ISSUER,
        audience: AUTH_JWT_AUDIENCE,
    });
    const requireCustomer = createRequireRole(['customer', 'admin']);

    app.use(express.json());

    app.get('/health', (_req, res) => res.json({ service: 'user-service', status: 'ok' }));

    const usersApi = express.Router();
    usersApi.get('/me', requireAuth, requireCustomer, (req, res) => {
        const requestId = req.get(requestIdHeader) || crypto.randomUUID();
        const forwarded = buildForwardedAuthContext(req);

        return res.status(200).json({
            success: true,
            data: {
                auth: req.auth || null,
                forwardedAuth: forwarded,
            },
            error: null,
            meta: { requestId },
        });
    });
    app.use('/api/v1/users', usersApi);

    app.post('/internal/users/bootstrap', (req, res) => {
        const requestId = req.get(requestIdHeader) || crypto.randomUUID();
        const subjectId = typeof req.body.subjectId === 'string' ? req.body.subjectId.trim() : '';
        const accountId = typeof req.body.accountId === 'string' ? req.body.accountId.trim() : null;

        if (!subjectId) {
            return res.status(400).json({
                success: false,
                data: null,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'subjectId is required',
                },
                meta: { requestId },
            });
        }

        const existing = customerProfilesBySubjectId.get(subjectId);
        if (existing) {
            return res.status(200).json({
                success: true,
                data: existing,
                error: null,
                meta: { requestId, idempotent: true, created: false },
            });
        }

        const profile = {
            profileId: crypto.randomUUID(),
            subjectId,
            accountId,
            status: 'active',
            createdAt: new Date().toISOString(),
        };
        customerProfilesBySubjectId.set(subjectId, profile);

        return res.status(201).json({
            success: true,
            data: profile,
            error: null,
            meta: { requestId, idempotent: false, created: true },
        });
    });

    app.get('/', (_req, res) => res.send('User Service'));

    app.use((error, req, res, _next) => {
        const requestId = (req && req.get && req.get(requestIdHeader)) || null;
        return res.status(error.statusCode || 500).json({
            success: false,
            data: null,
            error: {
                code: error.code || 'INTERNAL_ERROR',
                message: error.message || 'Unexpected user-service error',
                details: error.details || null,
            },
            meta: { requestId },
        });
    });

    return app;
}

if (require.main === module) {
    const app = createApp();
    const port = Number.parseInt(process.env.PORT || '3000', 10);
    app.listen(port, () => console.log(`User service listening on ${port}`));
}

module.exports = {
    createApp,
};
