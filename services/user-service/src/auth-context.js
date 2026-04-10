function buildForwardedAuthContext(req) {
    const headers = (req && req.headers) || {};
    const rolesRaw = typeof headers['x-auth-roles'] === 'string' ? headers['x-auth-roles'] : '';
    const scopeRaw = typeof headers['x-auth-scope'] === 'string' ? headers['x-auth-scope'] : '';
    const permissionsRaw =
        typeof headers['x-auth-permissions'] === 'string' ? headers['x-auth-permissions'] : '';

    return {
        subjectId: normalize(headers['x-auth-subject-id']),
        accountId: normalize(headers['x-auth-account-id']),
        sessionId: normalize(headers['x-auth-session-id']),
        role: normalize(headers['x-auth-role']),
        roles: rolesRaw
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        scopes: scopeRaw
            .split(/\s+/)
            .map((item) => item.trim())
            .filter(Boolean),
        permissions: permissionsRaw
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
    };
}

function normalize(value) {
    return typeof value === 'string' ? value.trim() : null;
}

module.exports = {
    buildForwardedAuthContext,
};
