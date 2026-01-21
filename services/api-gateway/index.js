const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = process.env.PORT || 3000;

// Health check
app.get("/health", (req, res) => {
    res.status(200).json({
        service: "api-gateway",
        status: "ok",
    });
});

// ===== Proxy routes =====

// Auth
app.use(
    "/auth",
    createProxyMiddleware({
        target: "http://auth-service:3001",
        changeOrigin: true,
        pathRewrite: { "^/auth": "" },
    })
);

// User
app.use(
    "/user",
    createProxyMiddleware({
        target: "http://user-service:3002",
        changeOrigin: true,
        pathRewrite: { "^/user": "" },
    })
);

// Driver
app.use(
    "/driver",
    createProxyMiddleware({
        target: "http://driver-service:3003",
        changeOrigin: true,
        pathRewrite: { "^/driver": "" },
    })
);

// Booking
app.use(
    "/booking",
    createProxyMiddleware({
        target: "http://booking-service:3004",
        changeOrigin: true,
        pathRewrite: { "^/booking": "" },
    })
);

// Ride
app.use(
    "/ride",
    createProxyMiddleware({
        target: "http://ride-service:3005",
        changeOrigin: true,
        pathRewrite: { "^/ride": "" },
    })
);

// Pricing
app.use(
    "/pricing",
    createProxyMiddleware({
        target: "http://pricing-service:3006",
        changeOrigin: true,
        pathRewrite: { "^/pricing": "" },
    })
);

// Payment
app.use(
    "/payment",
    createProxyMiddleware({
        target: "http://payment-service:3007",
        changeOrigin: true,
        pathRewrite: { "^/payment": "" },
    })
);

// Review
app.use(
    "/review",
    createProxyMiddleware({
        target: "http://review-service:3008",
        changeOrigin: true,
        pathRewrite: { "^/review": "" },
    })
);

// Notification
app.use(
    "/notification",
    createProxyMiddleware({
        target: "http://notification-service:3009",
        changeOrigin: true,
        pathRewrite: { "^/notification": "" },
    })
);

// Start server
app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});
