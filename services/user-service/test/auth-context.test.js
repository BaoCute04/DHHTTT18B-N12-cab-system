const test = require('node:test');
const assert = require('node:assert/strict');

const { buildForwardedAuthContext } = require('../src/auth-context');

test('buildForwardedAuthContext reads normalized auth headers', () => {
    const req = {
        headers: {
            'x-auth-subject-id': 'sub-1',
            'x-auth-account-id': 'acc-1',
            'x-auth-session-id': 'sess-1',
            'x-auth-role': 'customer',
            'x-auth-roles': 'customer,admin',
        },
    };

    assert.deepEqual(buildForwardedAuthContext(req), {
        subjectId: 'sub-1',
        accountId: 'acc-1',
        sessionId: 'sess-1',
        role: 'customer',
        roles: ['customer', 'admin'],
        scopes: [],
        permissions: [],
    });
});
