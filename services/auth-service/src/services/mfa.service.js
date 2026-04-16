const crypto = require('crypto');

const {
    generateTotpSecret,
    verifyTotpCode,
    generateRecoveryCodes,
    hashRecoveryCode,
} = require('../lib/totp');

function createMfaService(options) {
    const { pool, redisClient, security, env } = options;
    const challengeTtlSeconds = Math.max(1, security.adminMfa.challengeTtlSeconds || 300);

    return {
        async ensureTotpEnrollment({ accountId, subjectId }) {
            const existing = await findPrimaryEnrollment(pool, accountId);
            if (existing) {
                return {
                    enrollment: existing,
                    setup: null,
                };
            }

            const accountLabel = subjectId || accountId;
            const generated = generateTotpSecret({
                accountLabel,
                issuer: security.adminMfa.issuer,
            });
            const enrollment = await createEnrollment(pool, accountId, generated.base32);
            const recoveryCodes = generateRecoveryCodes(security.adminMfa.recoveryCodesCount);
            await saveRecoveryCodes(pool, enrollment.id, recoveryCodes);

            return {
                enrollment,
                setup: {
                    totpSecret: env.nodeEnv === 'production' ? null : generated.base32,
                    otpauthUrl: generated.otpauthUrl,
                    recoveryCodes: env.nodeEnv === 'production' ? null : recoveryCodes,
                    recoveryCodesCount: recoveryCodes.length,
                },
            };
        },

        async createChallenge({ accountId, sessionDraft }) {
            const challengeToken = crypto.randomBytes(32).toString('base64url');
            const challengeKey = buildAdminChallengeKey(challengeToken);
            await redisClient.set(challengeKey, JSON.stringify({ accountId, sessionDraft }), 'EX', challengeTtlSeconds);

            return {
                challengeToken,
                expiresInSeconds: challengeTtlSeconds,
            };
        },

        async consumeChallenge(challengeToken) {
            const challengeKey = buildAdminChallengeKey(challengeToken);
            const raw = await redisClient.get(challengeKey);
            if (!raw) {
                const error = new Error('MFA challenge is invalid or expired');
                error.statusCode = 401;
                error.code = 'MFA_CHALLENGE_INVALID';
                throw error;
            }

            await redisClient.del(challengeKey);
            const parsed = JSON.parse(raw);
            return parsed;
        },

        async verifyMfaCode({ accountId, totpCode, recoveryCode }) {
            const enrollment = await findPrimaryEnrollment(pool, accountId);
            if (!enrollment) {
                const error = new Error('MFA enrollment not found');
                error.statusCode = 400;
                error.code = 'MFA_ENROLLMENT_MISSING';
                throw error;
            }

            if (recoveryCode) {
                const consumed = await tryConsumeRecoveryCode(pool, enrollment.id, recoveryCode);
                if (!consumed) {
                    const error = new Error('Recovery code is invalid');
                    error.statusCode = 401;
                    error.code = 'MFA_CODE_INVALID';
                    throw error;
                }
                return { method: 'recovery_code' };
            }

            const validTotp = verifyTotpCode({
                secretBase32: enrollment.secret_encrypted,
                token: totpCode,
                window: security.adminMfa.window,
            });
            if (!validTotp) {
                const error = new Error('TOTP code is invalid');
                error.statusCode = 401;
                error.code = 'MFA_CODE_INVALID';
                throw error;
            }

            await markEnrollmentVerified(pool, enrollment.id);
            return { method: 'totp' };
        },
    };
}

function buildAdminChallengeKey(challengeToken) {
    return `admin:mfa:challenge:${challengeToken}`;
}

async function findPrimaryEnrollment(pool, accountId) {
    const result = await pool.query(
        `SELECT id, account_id, method, secret_encrypted, is_primary, verified_at, created_at, updated_at
         FROM mfa_enrollments
         WHERE account_id = $1 AND is_primary = TRUE
         LIMIT 1`,
        [accountId]
    );
    return result.rows[0] || null;
}

async function createEnrollment(pool, accountId, secretBase32) {
    const result = await pool.query(
        `INSERT INTO mfa_enrollments (account_id, method, secret_encrypted, is_primary)
         VALUES ($1, 'totp', $2, TRUE)
         RETURNING id, account_id, method, secret_encrypted, is_primary, verified_at, created_at, updated_at`,
        [accountId, secretBase32]
    );
    return result.rows[0];
}

async function saveRecoveryCodes(pool, enrollmentId, recoveryCodes) {
    for (const code of recoveryCodes) {
        const codeHash = hashRecoveryCode(code);
        await pool.query(
            `INSERT INTO mfa_recovery_codes (enrollment_id, code_hash)
             VALUES ($1, $2)
             ON CONFLICT (enrollment_id, code_hash) DO NOTHING`,
            [enrollmentId, codeHash]
        );
    }
}

async function tryConsumeRecoveryCode(pool, enrollmentId, recoveryCode) {
    const codeHash = hashRecoveryCode(recoveryCode);
    const result = await pool.query(
        `UPDATE mfa_recovery_codes
         SET used_at = NOW()
         WHERE enrollment_id = $1 AND code_hash = $2 AND used_at IS NULL
         RETURNING id`,
        [enrollmentId, codeHash]
    );
    return Boolean(result.rows[0]);
}

async function markEnrollmentVerified(pool, enrollmentId) {
    await pool.query(
        `UPDATE mfa_enrollments
         SET verified_at = COALESCE(verified_at, NOW()), updated_at = NOW()
         WHERE id = $1`,
        [enrollmentId]
    );
}

module.exports = {
    createMfaService,
};
