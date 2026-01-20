const express = require('express');
const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ service: 'notification-service', status: 'ok' }));
app.get('/', (req, res) => res.send('Notification Service'));

const port = process.env.PORT || 3006;
app.listen(port, () => console.log(`Notification service listening on ${port}`));
