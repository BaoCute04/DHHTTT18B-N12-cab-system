const express = require('express');
const { canDriverUpdateAssignedRideLocation } = require('./src/abac');

// Must match JWT `sub` / gateway `x-auth-subject-id` for the driver token. OTP bootstrap issues a UUID, not "driver-1".
const ASSIGNED_DRIVER_SUBJECT_ID =
    process.env.RIDE_ABAC_ASSIGNED_DRIVER_SUBJECT_ID || 'driver-1';

const ridesById = new Map([
    [
        'ride-active-assigned-driver-1',
        {
            id: 'ride-active-assigned-driver-1',
            status: 'ACTIVE',
            assignedDriverSubjectId: ASSIGNED_DRIVER_SUBJECT_ID,
            lastLocation: null,
        },
    ],
    [
        'ride-completed-assigned-driver-1',
        {
            id: 'ride-completed-assigned-driver-1',
            status: 'COMPLETED',
            assignedDriverSubjectId: ASSIGNED_DRIVER_SUBJECT_ID,
            lastLocation: null,
        },
    ],
]);

function createApp() {
    const app = express();
    app.use(express.json());

    const ridesApi = express.Router();

    ridesApi.patch('/driver/rides/:rideId/location', (req, res) => {
        const actor = extractActorFromHeaders(req);
        const rideId = String(req.params.rideId || '');
        const ride = ridesById.get(rideId);

        if (!ride) {
            return res.status(404).json({
                success: false,
                data: null,
                error: {
                    code: 'RIDE_NOT_FOUND',
                    message: 'Ride does not exist',
                },
            });
        }

        if (actor.role === 'admin') {
            return updateRideLocationAndRespond(ride, req, res);
        }

        const decision = canDriverUpdateAssignedRideLocation({ actor, ride });
        if (!decision.allowed) {
            return res.status(403).json({
                success: false,
                data: null,
                error: {
                    code: 'RIDE_LOCATION_UPDATE_FORBIDDEN',
                    message: 'Token permission is insufficient for current ride context',
                    details: { reason: decision.reason },
                },
            });
        }

        return updateRideLocationAndRespond(ride, req, res);
    });

    app.use('/api/v1/rides', ridesApi);

    app.get('/health', (_req, res) => res.json({ service: 'ride-service', status: 'ok' }));

    app.get('/', (_req, res) => res.send('Ride Service'));

    return app;
}

function extractActorFromHeaders(req) {
    const headers = (req && req.headers) || {};
    const permissionsRaw = typeof headers['x-auth-permissions'] === 'string' ? headers['x-auth-permissions'] : '';

    return {
        role: normalize(headers['x-auth-role']),
        subjectId: normalize(headers['x-auth-subject-id']),
        permissions: permissionsRaw
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
    };
}

function normalize(value) {
    return typeof value === 'string' ? value.trim() : null;
}

function updateRideLocationAndRespond(ride, req, res) {
    const latitude = Number(req.body && req.body.latitude);
    const longitude = Number(req.body && req.body.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return res.status(400).json({
            success: false,
            data: null,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'latitude and longitude are required numbers',
            },
        });
    }

    ride.lastLocation = {
        latitude,
        longitude,
        updatedAt: new Date().toISOString(),
    };

    return res.status(200).json({
        success: true,
        data: {
            rideId: ride.id,
            status: ride.status,
            assignedDriverSubjectId: ride.assignedDriverSubjectId,
            lastLocation: ride.lastLocation,
        },
        error: null,
    });
}

if (require.main === module) {
    const app = createApp();
    const port = Number.parseInt(process.env.PORT || '3000', 10);
    app.listen(port, () => console.log(`Ride service listening on ${port}`));
}

module.exports = {
    createApp,
};
