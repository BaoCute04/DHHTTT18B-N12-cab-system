const crypto = require('crypto');
const express = require('express');

const requestIdHeader = (process.env.REQUEST_ID_HEADER || 'x-request-id').toLowerCase();

function successEnvelope(data, requestId) {
    return {
        success: true,
        data,
        error: null,
        meta: { requestId },
    };
}

function errorEnvelope(error, requestId) {
    return {
        success: false,
        data: null,
        error: {
            code: error.code || 'INTERNAL_ERROR',
            message: error.message || 'Unexpected server error',
            details: error.details || null,
        },
        meta: { requestId },
    };
}

function requestIdMiddleware(req, res, next) {
    const requestId = req.header(requestIdHeader) || crypto.randomUUID();
    req.requestId = requestId;
    res.setHeader(requestIdHeader, requestId);
    next();
}

function validateOtpNotificationBody(body) {
    if (!body || typeof body !== 'object') {
        return { valid: false, message: 'Body must be an object' };
    }

    const requiredStringFields = ['destination', 'channel', 'templateKey', 'message'];
    for (const field of requiredStringFields) {
        if (typeof body[field] !== 'string' || body[field].trim().length === 0) {
            return { valid: false, message: `Field ${field} must be a non-empty string` };
        }
    }

    if (!['sms', 'email'].includes(body.channel)) {
        return { valid: false, message: 'Field channel must be either sms or email' };
    }

    if (body.variables != null && typeof body.variables !== 'object') {
        return { valid: false, message: 'Field variables must be an object when provided' };
    }

    return { valid: true };
}

function createApp() {
    const app = express();

    app.use(express.json());
    app.use(requestIdMiddleware);

    app.get('/health', (req, res) => {
        return res.status(200).json(
            successEnvelope(
                {
                    service: 'notification-service',
                    status: 'ok',
                },
                req.requestId
            )
        );
    });

    app.get('/api/v1/notifications', (req, res) => {
        return res.status(200).json(
            successEnvelope(
                {
                    service: 'notification-service',
                    message: 'Notifications API (OTP delivery uses internal routes)',
                },
                req.requestId
            )
        );
    });

    app.post('/internal/notifications/otp', (req, res, next) => {
        try {
            const validation = validateOtpNotificationBody(req.body);
            if (!validation.valid) {
                const error = new Error('Request validation failed');
                error.statusCode = 400;
                error.code = 'VALIDATION_ERROR';
                error.details = { reason: validation.message };
                throw error;
            }

            const providerMessageId = `otp_${Date.now()}_${crypto.randomInt(1000, 9999)}`;
            const response = {
                accepted: true,
                providerMessageId,
                failureCode: null,
                timestamp: new Date().toISOString(),
                channel: req.body.channel,
                destination: req.body.destination,
            };

            return res.status(202).json(successEnvelope(response, req.requestId));
        } catch (error) {
            return next(error);
        }
    });

    app.get('/', (req, res) => {
        return res.status(200).json(successEnvelope({ service: 'notification-service' }, req.requestId));
    });

    app.use((error, req, res, _next) => {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(errorEnvelope(error, req.requestId || null));
    });

    return app;
}

if (require.main === module) {
    const app = createApp();
    const port = Number.parseInt(process.env.PORT || '3000', 10);
    app.listen(port, () => console.log(`Notification service listening on ${port}`));
}

module.exports = {
    createApp,
};
