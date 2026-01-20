const express = require('express');
const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ service: 'pricing-service', status: 'ok' }));
app.get('/', (req, res) => res.send('Pricing Service'));

const port = process.env.PORT || 3007;
app.listen(port, () => console.log(`Pricing service listening on ${port}`));
