function createNotificationClientService(options) {
    const {
        notificationBaseUrl,
        requestIdHeader = 'x-request-id',
        timeoutMs = 5000,
        fetchImpl = fetch,
    } = options;

    return {
        async sendOtp({ destination, channel, role, code, requestId }) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), timeoutMs);

            try {
                const destinationPayload =
                    channel === 'email'
                        ? { email: destination }
                        : { phoneNumber: destination };

                const response = await fetchImpl(`${notificationBaseUrl}/internal/notifications/send`, {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                        [requestIdHeader]: requestId,
                    },
                    body: JSON.stringify({
                        userId: destination,
                        type: 'AUTH_OTP',
                        title: 'Verification code',
                        channel,
                        destination: destinationPayload,
                        relatedEntityType: 'AUTH',
                        relatedEntityId: `${role}:${destination}`,
                        message: `Your verification code is ${code}.`,
                        metadata: {
                            templateKey: `auth_otp_${role}`,
                            role,
                            variables: { code },
                        },
                    }),
                    signal: controller.signal,
                });

                const payload = await response.json().catch(() => null);
                if (!response.ok || !payload || payload.success !== true) {
                    const error = new Error('OTP delivery failed');
                    error.statusCode = 503;
                    error.code = 'OTP_DELIVERY_UNAVAILABLE';
                    error.details = payload;
                    throw error;
                }

                return payload.data;
            } catch (error) {
                if (error.name === 'AbortError') {
                    const timeoutError = new Error('OTP delivery timed out');
                    timeoutError.statusCode = 503;
                    timeoutError.code = 'OTP_DELIVERY_TIMEOUT';
                    throw timeoutError;
                }

                if (error && error.code === 'OTP_DELIVERY_UNAVAILABLE') {
                    throw error;
                }

                const deliveryError = new Error('OTP delivery unavailable');
                deliveryError.statusCode = 503;
                deliveryError.code = 'OTP_DELIVERY_UNAVAILABLE';
                deliveryError.details = {
                    cause: error && error.message ? error.message : String(error),
                };
                throw deliveryError;
            } finally {
                clearTimeout(timeout);
            }
        },
    };
}

module.exports = {
    createNotificationClientService,
};
