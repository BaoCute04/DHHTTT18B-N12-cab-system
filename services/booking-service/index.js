const express = require('express');
const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ service: 'booking-service', status: 'ok' }));
app.get('/', (req, res) => res.send('Booking Service'));

const port = process.env.PORT || 3003;
app.listen(port, () => console.log(`Booking service listening on ${port}`));
