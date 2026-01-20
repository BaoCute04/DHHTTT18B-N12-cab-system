const express = require('express');
const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ service: 'driver-service', status: 'ok' }));
app.get('/', (req, res) => res.send('Driver Service'));

const port = process.env.PORT || 3004;
app.listen(port, () => console.log(`Driver service listening on ${port}`));
