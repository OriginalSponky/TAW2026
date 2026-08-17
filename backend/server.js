const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();

app.use(cors());

const dbPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: 'express_user',
    password: 'root',
    database: 'app_database',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await dbPool.query('SELECT * FROM Users');
        res.json(rows);
    } catch (error) {
        console.error("Errore DB:", error);
        res.status(500).send("Errore interno");
    }
});

app.listen(3000, () => {
    console.log('Backend in ascolto sulla porta 3000');
});