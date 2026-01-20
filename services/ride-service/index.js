const express = require('express');
const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ service: 'ride-service', status: 'ok' }));
app.get('/', (req, res) => res.send('Ride Service'));

const port = process.env.PORT || 3009;
app.listen(port, () => console.log(`Ride service listening on ${port}`));
