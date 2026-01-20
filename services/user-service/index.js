const express = require('express');
const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ service: 'user-service', status: 'ok' }));
app.get('/', (req, res) => res.send('User Service'));

const port = process.env.PORT || 3002;
app.listen(port, () => console.log(`User service listening on ${port}`));
