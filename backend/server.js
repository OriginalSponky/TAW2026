const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/saluto', (req, res) => {
    res.send('Welcome to Express Routing!');
});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});