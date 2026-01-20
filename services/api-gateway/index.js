const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

app.get('/health', (req, res) => res.json({ service: 'api-gateway', status: 'ok' }));

// Example proxies
app.use('/auth', createProxyMiddleware({ target: 'http://auth-service:3001', changeOrigin: true, pathRewrite: {'^/auth': ''} }));
app.use('/user', createProxyMiddleware({ target: 'http://user-service:3002', changeOrigin: true, pathRewrite: {'^/user': ''} }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API Gateway listening on ${port}`));
