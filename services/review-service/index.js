const express = require('express');
const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ service: 'review-service', status: 'ok' }));
app.get('/', (req, res) => res.send('Review Service'));

const port = process.env.PORT || 3008;
app.listen(port, () => console.log(`Review service listening on ${port}`));
