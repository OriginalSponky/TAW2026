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

// Regular login route
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [rows] = await dbPool.query(
            'SELECT * FROM Users WHERE email = ? AND password_hash = ?',
            [email, password]
        );

        if (rows.length > 0) {
            const user = rows[0];
            res.json({
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                matriculation_number: user.matriculation_number
            });
        } else {
            res.status(401).send("Credenziali non valide");
        }
    } catch (error) {
        console.error("Errore DB:", error);
        res.status(500).send("Errore interno");
    }
});

// Google Auth route
app.post('/api/google-login', async (req, res) => {
    const { email } = req.body;

    try {
        const [rows] = await dbPool.query('SELECT * FROM Users WHERE email = ?', [email]);

        if (rows.length > 0) {
            const user = rows[0];
            
            const matricolaEstratta = email.split('@')[0];
            
            res.json({
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                matriculation_number: matricolaEstratta
            });
        } else {
            res.status(401).send("Questa email non è autorizzata o non è nel sistema.");
        }
    } catch (error) {
        console.error("Errore DB Google Login:", error);
        res.status(500).send("Errore interno");
    }
});

app.listen(3000, () => {
    console.log('Backend in ascolto sulla porta 3000');
});