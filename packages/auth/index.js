'use strict';

const { createRemoteJWKSet, jwtVerify } = require('jose');

function normalizeAudience(audienceOption) {
    if (!audienceOption) {
        return undefined;
    }
    if (Array.isArray(audienceOption)) {
        return audienceOption;
    }
    return [audienceOption];
}

function createRequireAuth(options) {
    const { jwksUri, issuer, audience } = options;
    const JWKS = createRemoteJWKSet(new URL(jwksUri));
    const audienceList = normalizeAudience(audience);

    return async function requireAuth(req, res, next) {
        try {
            const authorization = req.headers.authorization;
            if (!authorization || typeof authorization !== 'string') {
                const err = new Error('Bearer token is required');
                err.statusCode = 401;
                err.code = 'UNAUTHORIZED';
                return next(err);
            }
            const [scheme, token] = authorization.trim().split(/\s+/, 2);
            if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
                const err = new Error('Bearer token is required');
                err.statusCode = 401;
                err.code = 'UNAUTHORIZED';
                return next(err);
            }

            const verifyOpts = { issuer: issuer || undefined };
            if (audienceList && audienceList.length > 0) {
                verifyOpts.audience = audienceList.length === 1 ? audienceList[0] : audienceList;
            }

            const { payload } = await jwtVerify(token, JWKS, verifyOpts);

            const rolesRaw = payload.roles;
            const roles = Array.isArray(rolesRaw)
                ? rolesRaw.map((r) => String(r).toLowerCase()).filter(Boolean)
                : [];

            const primaryRole = payload.role != null ? String(payload.role).toLowerCase() : null;

            req.auth = {
                sub: payload.sub,
                subjectId: payload.sub,
                accountId: payload.aid ?? payload.accountId ?? null,
                sessionId: payload.sid ?? null,
                role: primaryRole,
                roles: roles.length > 0 ? roles : primaryRole ? [primaryRole] : [],
                claims: payload,
            };
            return next();
        } catch (cause) {
            const err = new Error('Access token is invalid or expired');
            err.statusCode = 401;
            err.code = 'INVALID_TOKEN';
            err.cause = cause;
            return next(err);
        }
    };
}

function createRequireRole(allowedRoles) {
    const allowed = new Set(allowedRoles.map((r) => String(r).toLowerCase()));

    return function requireRole(req, res, next) {
        const auth = req.auth;
        if (!auth) {
            const err = new Error('Unauthorized');
            err.statusCode = 401;
            return next(err);
        }
        const candidateRoles =
            auth.roles && auth.roles.length > 0 ? auth.roles : auth.role ? [auth.role] : [];
        const ok = candidateRoles.some((r) => allowed.has(String(r).toLowerCase()));
        if (!ok) {
            const err = new Error('Forbidden');
            err.statusCode = 403;
            err.code = 'FORBIDDEN';
            return next(err);
        }
        return next();
    };
}

module.exports = {
    createRequireAuth,
    createRequireRole,
};
