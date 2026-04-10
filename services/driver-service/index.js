const crypto = require('crypto');
const express = require('express');

const requestIdHeader = process.env.REQUEST_ID_HEADER || 'x-request-id';
const driverProfilesBySubjectId = new Map();

function createApp() {
    const app = express();

    app.use(express.json());

    app.get('/health', (req, res) => res.json({ service: 'driver-service', status: 'ok' }));

    app.get('/api/v1/drivers', (req, res) => {
        const requestId = req.get(requestIdHeader) || crypto.randomUUID();
        return res.status(200).json({
            success: true,
            data: { service: 'driver-service', message: 'Driver API (bootstrap via internal routes)' },
            error: null,
            meta: { requestId },
        });
    });

    app.post('/internal/drivers/bootstrap', (req, res) => {
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

        const existing = driverProfilesBySubjectId.get(subjectId);
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
            status: 'pending_profile',
            createdAt: new Date().toISOString(),
        };
        driverProfilesBySubjectId.set(subjectId, profile);

        return res.status(201).json({
            success: true,
            data: profile,
            error: null,
            meta: { requestId, idempotent: false, created: true },
        });
    });

    app.get('/', (req, res) => res.send('Driver Service'));

    return app;
}

if (require.main === module) {
    const app = createApp();
    const port = Number.parseInt(process.env.PORT || '3000', 10);
    app.listen(port, () => console.log(`Driver service listening on ${port}`));
}

module.exports = {
    createApp,
};
