const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const dbPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: 'express_user',
    password: 'root',
    database: 'app_database',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Nuova rotta di Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Interroghiamo il database cercando l'esatta combinazione email/password
        const [rows] = await dbPool.query(
            'SELECT * FROM Users WHERE email = ? AND password_hash = ?',
            [email, password]
        );

        if (rows.length > 0) {
            const user = rows[0];
            // Login ok: restituiamo al frontend solo i dati utili (NON la password)
            res.json({
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                matriculation_number: user.matriculation_number
            });
        } else {
            // Nessuna corrispondenza trovata
            res.status(401).send("Credenziali non valide");
        }
    } catch (error) {
        console.error("Errore DB:", error);
        res.status(500).send("Errore interno");
    }
});

/*
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await dbPool.query('SELECT * FROM Users');
        res.json(rows);
    } catch (error) {
        console.error("Errore DB:", error);
        res.status(500).send("Errore interno");
    }
}); */

app.listen(3000, () => {
    console.log('Backend in ascolto sulla porta 3000');
});