const express = require('express');
const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ service: 'auth-service', status: 'ok' }));
app.get('/', (req, res) => res.send('Auth Service'));

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Auth service listening on ${port}`));
