const test = require('node:test');
const assert = require('node:assert/strict');

const { canDriverUpdateAssignedRideLocation } = require('../src/abac');

test('denies location update when ride is not ACTIVE', () => {
    const decision = canDriverUpdateAssignedRideLocation({
        actor: {
            role: 'driver',
            subjectId: 'driver-1',
            permissions: ['location:update:assigned'],
        },
        ride: {
            id: 'ride-1',
            status: 'COMPLETED',
            assignedDriverSubjectId: 'driver-1',
        },
    });

    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, 'ride_inactive');
});

test('denies location update when ride is active but assigned to another driver', () => {
    const decision = canDriverUpdateAssignedRideLocation({
        actor: {
            role: 'driver',
            subjectId: 'driver-1',
            permissions: ['location:update:assigned'],
        },
        ride: {
            id: 'ride-1',
            status: 'ACTIVE',
            assignedDriverSubjectId: 'driver-2',
        },
    });

    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, 'ride_not_assigned_to_driver');
});
