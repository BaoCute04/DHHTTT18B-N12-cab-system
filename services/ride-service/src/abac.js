function canDriverUpdateAssignedRideLocation({ actor, ride }) {
    if (!actor || actor.role !== 'driver') {
        return { allowed: false, reason: 'actor_not_driver' };
    }

    const permissions = Array.isArray(actor.permissions) ? actor.permissions : [];
    if (!permissions.includes('location:update:assigned')) {
        return { allowed: false, reason: 'missing_permission' };
    }

    if (!ride || ride.status !== 'ACTIVE') {
        return { allowed: false, reason: 'ride_inactive' };
    }

    if (!actor.subjectId || ride.assignedDriverSubjectId !== actor.subjectId) {
        return { allowed: false, reason: 'ride_not_assigned_to_driver' };
    }

    return { allowed: true, reason: 'allowed' };
}

module.exports = {
    canDriverUpdateAssignedRideLocation,
};
