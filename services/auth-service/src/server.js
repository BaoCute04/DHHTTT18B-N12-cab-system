const { createApp } = require('./app');
const { loadEnv } = require('./config/env');

function startServer() {
    const env = loadEnv();
    const app = createApp({ env });

    app.listen(env.port, () => {
        console.log(`Auth service listening on ${env.port}`);
    });
}

module.exports = {
    startServer,
};
