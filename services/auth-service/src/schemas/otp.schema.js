const { z } = require('zod');

const otpRequestSchema = z.object({
    destination: z.string().trim().min(3).max(255),
    role: z.enum(['customer', 'driver']),
    channel: z.enum(['sms', 'email']).default('sms'),
});

const otpVerifySchema = z.object({
    destination: z.string().trim().min(3).max(255),
    role: z.enum(['customer', 'driver']),
    code: z
        .string()
        .trim()
        .regex(/^\d{6}$/, 'OTP code must be a 6-digit value'),
});

module.exports = {
    otpRequestSchema,
    otpVerifySchema,
};
