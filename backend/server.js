const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');

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
        const [rows] = await dbPool.query('SELECT * FROM Users WHERE email = ?', [email]);

        if (rows.length > 0) {
            const user = rows[0];
            let passwordCorretta = false;
            // Secure, with hash, login
            if (user.password_hash && user.password_hash.startsWith('$2')) {
                passwordCorretta = await bcrypt.compare(password, user.password_hash);
            } else {
                // Altrimenti, è un vecchio utente di test inserito a mano: facciamo il confronto esatto.
                passwordCorretta = (password === user.password_hash);
            }

            if (passwordCorretta) {
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
            // Non existent user
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
    const { email, given_name, family_name } = req.body;

    try {
        const [rows] = await dbPool.query('SELECT * FROM Users WHERE email = ?', [email]);

        if (rows.length > 0) {
            // Existing User
            const user = rows[0];
            const matricolaEstratta = email.split('@')[0];

            res.json({
                action: 'LOGIN',
                user: {
                    first_name: user.first_name,
                    last_name: user.last_name,
                    role: user.role,
                    matriculation_number: matricolaEstratta
                }
            });
        } else {
            // New User, add with google's data
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
                        first_name: given_name || '',
                        last_name: family_name || ''
                    }
                });
            } else {
                res.status(401).send("Questa email non è autorizzata o non è nel sistema.");
            }
        }
    } catch (error) {
        console.error("Errore DB Google Login:", error);
        res.status(500).send("Errore interno");
    }
});

// Application Request Route

// Istitutions
app.get('/api/institutions', async (req, res) => {
    try {
        const [rows] = await dbPool.query('SELECT id, name, country FROM Institutions');
        res.json(rows);
    } catch (error) {
        res.status(500).send("Errore DB Istituzioni");
    }
});

// Professors
app.get('/api/lecturers', async (req, res) => {
    try {
        const [rows] = await dbPool.query("SELECT id, first_name, last_name FROM Users WHERE role = 'LECTURER'");
        res.json(rows);
    } catch (error) {
        res.status(500).send("Errore DB Professori");
    }
});

// Save Application Request
app.post('/api/applications', async (req, res) => {
    const { student_email, institution_id, lecturer_id, academic_year, mobility_period, exams } = req.body;

    const connection = await dbPool.getConnection();
    try {
        // Transaction Start
        await connection.beginTransaction();

        // Student ID
        const [users] = await connection.query('SELECT id FROM Users WHERE email = ?', [student_email]);
        if (users.length === 0) throw new Error("Studente non trovato nel database.");
        const student_id = users[0].id;

        // Main Application Request
        const [appResult] = await connection.query(
            `INSERT INTO Applications 
            (student_id, institution_id, lecturer_id, academic_year, mobility_period, status) 
            VALUES (?, ?, ?, ?, ?, 'AWAITING_FOR_APPROVAL')`,
            [student_id, institution_id, lecturer_id, academic_year, mobility_period]
        );
        const applicationId = appResult.insertId;

        // Mapped exams connected to Application Id
        for (const exam of exams) {
            await connection.query(
                `INSERT INTO ExamsMapping 
                (application_id, foreign_course_code, foreign_course_name, foreign_course_credits, unive_course_code, unive_course_title, unive_course_credits) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [applicationId, exam.foreignCode, exam.foreignName, exam.foreignCredits, exam.localCode, exam.localName, exam.localCredits]
            );
        }

        // Learning Agreement attachment
        await connection.query(
            `INSERT INTO Documents (application_id, document_type, file_name, file_path, status) 
             VALUES (?, 'LEARNING_AGREEMENT', 'documento_simulato.pdf', '/uploads/simulato.pdf', 'PENDING')`,
            [applicationId]
        );

        await connection.commit();
        res.json({ message: "Richiesta creata con successo!", applicationId });

    } catch (error) {
        await connection.rollback();
        console.error("Errore salvataggio richiesta:", error);
        res.status(500).send("Errore interno durante il salvataggio.");
    } finally {
        connection.release();
    }
});


// Add user to database
app.post('/api/register', async (req, res) => {
    const { email, password, first_name, last_name, role, matriculation_number } = req.body;
    try {
        // Password Cypher
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Password Saving
        await dbPool.query(
            'INSERT INTO Users (email, password_hash, first_name, last_name, role, matriculation_number) VALUES (?, ?, ?, ?, ?, ?)',
            [email, hashedPassword, first_name, last_name, role, matriculation_number]
        );
        res.json({ message: "Registrazione completata!" });
    } catch (error) {
        console.error("Errore DB Registrazione:", error);
        res.status(500).send("Errore durante la creazione dell'account.");
    }
});

// Application List Retrival
app.get('/api/applications', async (req, res) => {
    const studentEmail = req.query.email;

    if (!studentEmail) {
        return res.status(400).send("Email mancante");
    }

    try {
        const [rows] = await dbPool.query(`
            SELECT 
                a.id, 
                a.academic_year, 
                a.mobility_period, 
                a.status, 
                i.name AS institution_name 
            FROM Applications a
            JOIN Institutions i ON a.institution_id = i.id
            JOIN Users student ON a.student_id = student.id
            WHERE student.email = ?
            ORDER BY a.created_at DESC
        `, [studentEmail]);

        res.json(rows);
    } catch (error) {
        console.error("Errore recupero richieste:", error);
        res.status(500).send("Errore interno");
    }
});

// Single Application details
app.get('/api/applications/:id', async (req, res) => {
    const appId = req.params.id;
    try {
        const [appRows] = await dbPool.query(`
            SELECT a.*, i.name AS institution_name, i.country, i.city
            FROM Applications a
            JOIN Institutions i ON a.institution_id = i.id
            WHERE a.id = ?
        `, [appId]);

        if (appRows.length === 0) {
            return res.status(404).send("Richiesta non trovata");
        }

        const applicationData = appRows[0];

        // All exams related
        const [examRows] = await dbPool.query(`
            SELECT * FROM ExamsMapping WHERE application_id = ?
        `, [appId]);

        applicationData.exams = examRows;

        res.json(applicationData);
    } catch (error) {
        console.error("Errore recupero dettagli:", error);
        res.status(500).send("Errore interno");
    }
});

// Delete a specific application
app.delete('/api/applications/:id', async (req, res) => {
    const appId = req.params.id;
    try {
        await dbPool.query('DELETE FROM Applications WHERE id = ?', [appId]);
        res.json({ message: 'Application deleted successfully' });
    } catch (error) {
        console.error("Delete error:", error);
        res.status(500).send("Internal server error during deletion");
    }
});

// Update an existing application and its exams
app.put('/api/applications/:id', async (req, res) => {
    const appId = req.params.id;
    const { institution_id, lecturer_id, academic_year, mobility_period, exams } = req.body;

    const connection = await dbPool.getConnection();
    try {
        await connection.beginTransaction();

        // Update the main application details
        await connection.query(
            `UPDATE Applications 
             SET institution_id = ?, lecturer_id = ?, academic_year = ?, mobility_period = ? 
             WHERE id = ?`,
            [institution_id, lecturer_id, academic_year, mobility_period, appId]
        );

        // Clear the old exams
        await connection.query(`DELETE FROM ExamsMapping WHERE application_id = ?`, [appId]);

        // Insert the updated exams
        for (const exam of exams) {
            await connection.query(
                `INSERT INTO ExamsMapping 
                (application_id, foreign_course_code, foreign_course_name, foreign_course_credits, unive_course_code, unive_course_title, unive_course_credits) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [appId, exam.foreignCode, exam.foreignName, exam.foreignCredits, exam.localCode, exam.localName, exam.localCredits]
            );
        }

        await connection.commit();
        res.json({ message: "Application updated successfully!" });
    } catch (error) {
        await connection.rollback();
        console.error("Update error:", error);
        res.status(500).send("Internal server error during update");
    } finally {
        connection.release();
    }
});

app.listen(3000, () => {
    console.log('Backend in ascolto sulla porta 3000');
});