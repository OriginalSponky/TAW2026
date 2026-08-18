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
        //Existing email check
        const [rows] = await dbPool.query('SELECT * FROM Users WHERE email = ?', [email]);

        if (rows.length > 0) {
            const user = rows[0];
            if (user.password_hash === password) {
                res.json({
                    action: 'LOGIN',
                    user: {
                        first_name: user.first_name,
                        last_name: user.last_name,
                        role: user.role,
                        matriculation_number: user.matriculation_number,
                        email: user.email
                    }
                });
            } else {
                res.status(401).send("Password errata per questo account.");
            }
        } else {
            // User doesn't exist, check email if from uni org
            if (email.endsWith('@stud.unive.it') || email.endsWith('@unive.it')) {
                const isStudent = email.endsWith('@stud.unive.it');
                const role = isStudent ? 'STUDENT' : 'LECTURER';
                const matricula = isStudent ? email.split('@')[0] : null;

                res.json({
                    action: 'REQUIRES_REGISTRATION',
                    prefill: {
                        email: email,
                        role: role,
                        matriculation_number: matricula,
                        first_name: '',
                        last_name: ''
                    }
                });
            } else {
                res.status(401).send("Email non trovata e non appartenente all'Ateneo.");
            }
        }
    } catch (error) {
        console.error("Errore DB Login:", error);
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

// Add user to database
app.post('/api/register', async (req, res) => {
    const { email, password, first_name, last_name, role, matriculation_number } = req.body;
    try {
        await dbPool.query(
            'INSERT INTO Users (email, password_hash, first_name, last_name, role, matriculation_number) VALUES (?, ?, ?, ?, ?, ?)',
            [email, password, first_name, last_name, role, matriculation_number]
        );
        res.json({ message: "Registrazione completata!" });
    } catch (error) {
        console.error("Errore DB Registrazione:", error);
        res.status(500).send("Errore durante la creazione dell'account.");
    }
});