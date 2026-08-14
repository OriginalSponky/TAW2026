const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise'); // Importiamo la versione con supporto alle Promise

const app = express();

const dbPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: 'express_user',
    password: 'root',
    database: 'app_database',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/projects', async (req, res) => {
    try {
        // Eseguiamo la query sulla tabella creata in precedenza
        const [rows] = await dbPool.query('SELECT * FROM projects');

        res.json(rows);
    } catch (error) {
        console.error("Errore di connessione al database:", error);
        res.status(500).send("Errore interno del server");
    }
});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});