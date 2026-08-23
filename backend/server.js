const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

// UPLOAD CONFIG
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

//DB CONFIG
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
app.post('/api/applications', upload.single('learning_agreement_file'), async (req, res) => {
    const { student_email, institution_id, lecturer_id, academic_year, mobility_period, exams } = req.body;
    const file = req.file;

    let parsedExams = [];
    try { parsedExams = JSON.parse(exams); } catch (e) { }

    const connection = await dbPool.getConnection();
    try {
        await connection.beginTransaction();

        const [users] = await connection.query('SELECT id FROM Users WHERE email = ?', [student_email]);
        if (users.length === 0) throw new Error("Studente non trovato nel database.");
        const student_id = users[0].id;

        const [appResult] = await connection.query(
            `INSERT INTO Applications (student_id, institution_id, lecturer_id, academic_year, mobility_period, status)
             VALUES (?, ?, ?, ?, ?, 'CREATED')`,
            [student_id, institution_id, lecturer_id, academic_year, mobility_period]
        );
        const applicationId = appResult.insertId;

        for (const exam of parsedExams) {
            await connection.query(
                `INSERT INTO ExamsMapping (application_id, foreign_course_code, foreign_course_name, foreign_course_credits, unive_course_code, unive_course_title, unive_course_credits)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [applicationId, exam.foreignCode, exam.foreignName, exam.foreignCredits, exam.localCode, exam.localName, exam.localCredits]
            );
        }

        if (file) {
            const filePathDB = '/uploads/' + file.filename;
            await connection.query(
                `INSERT INTO Documents (application_id, document_type, file_name, file_path, status)
                 VALUES (?, 'LEARNING_AGREEMENT', ?, ?, 'PENDING')`,
                [applicationId, file.originalname, filePathDB]
            );
        }

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

        const [examRows] = await dbPool.query(`
            SELECT * FROM ExamsMapping WHERE application_id = ?
        `, [appId]);
        applicationData.exams = examRows;

        const [docRows] = await dbPool.query(`
            SELECT * FROM Documents
            WHERE application_id = ?
        `, [appId]);
        applicationData.documents = docRows;

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
app.put('/api/applications/:id', upload.single('learning_agreement_file'), async (req, res) => {
    const appId = req.params.id;
    const { institution_id, lecturer_id, academic_year, mobility_period, exams } = req.body;
    const file = req.file;

    let parsedExams = [];
    try { parsedExams = JSON.parse(exams); } catch (e) { }

    const connection = await dbPool.getConnection();
    try {
        await connection.beginTransaction();

        await connection.query(
            `UPDATE Applications 
             SET institution_id = ?, lecturer_id = ?, academic_year = ?, mobility_period = ? 
             WHERE id = ?`,
            [institution_id, lecturer_id, academic_year, mobility_period, appId]
        );

        await connection.query(`DELETE FROM ExamsMapping WHERE application_id = ?`, [appId]);

        for (const exam of parsedExams) {
            await connection.query(
                `INSERT INTO ExamsMapping (application_id, foreign_course_code, foreign_course_name, foreign_course_credits, unive_course_code, unive_course_title, unive_course_credits) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [appId, exam.foreignCode, exam.foreignName, exam.foreignCredits, exam.localCode, exam.localName, exam.localCredits]
            );
        }

        // Se in fase di modifica è stato caricato un nuovo file, lo aggiorniamo
        if (file) {
            const filePathDB = '/uploads/' + file.filename;
            await connection.query(`DELETE FROM Documents WHERE application_id = ? AND document_type = 'LEARNING_AGREEMENT'`, [appId]);
            await connection.query(
                `INSERT INTO Documents (application_id, document_type, file_name, file_path, status)
                 VALUES (?, 'LEARNING_AGREEMENT', ?, ?, 'PENDING')`,
                [appId, file.originalname, filePathDB]
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

// ROUTES FOR MOBILITY

//Avvia Mobilità o Aggiorna Date in Corsa
app.put('/api/applications/:id/dates', async (req, res) => {
    const appId = req.params.id;
    // Queste sono le variabili che ci manda Angular
    const { arrival_date, departure_date, start_mobility } = req.body;

    // Richiediamo una connessione dal pool per eseguire la transazione
    const connection = await dbPool.getConnection();

    try {
        await connection.beginTransaction();

        const dbArrival = (arrival_date && arrival_date.trim() !== '') ? arrival_date : null;
        const dbDeparture = (departure_date && departure_date.trim() !== '') ? departure_date : null;

        // Se start_mobility è VERO (L'utente ha cliccato "Avvia Erasmus" nella fase di pre-partenza)
        if (start_mobility) {
            await connection.query(
                // USIAMO I NOMI CORRETTI DEL DATABASE: actual_arrival_date e actual_departure_date
                `UPDATE Applications
                 SET actual_arrival_date = ?, actual_departure_date = ?, status = 'MOBILITY_IN_PROGRESS'
                 WHERE id = ?`,
                [dbArrival, dbDeparture, appId]
            );
        }
        else {
            await connection.query(
                `UPDATE Applications
                 SET actual_arrival_date = ?, actual_departure_date = ?
                 WHERE id = ?`,
                [dbArrival, dbDeparture, appId]
            );
        }

        await connection.commit();
        res.json({ message: "Date salvate con successo nel database!" });
    } catch (error) {
        await connection.rollback();
        console.error("🔴 ERRORE CRITICO AGGIORNAMENTO DATE:", error);
        res.status(500).send("Errore del server durante il salvataggio delle date: " + error.message);
    } finally {
        connection.release();
    }
});

// Official Renunciation
app.put('/api/applications/:id/cancel', async (req, res) => {
    try {
        await dbPool.query(`UPDATE Applications SET status = 'CANCELED' WHERE id = ?`, [req.params.id]);
        res.json({ message: 'Mobilità annullata' });
    } catch (error) {
        res.status(500).send("Errore durante l'annullamento");
    }
});

// Learning Agreement Modification
app.put('/api/applications/:id/modify-la', upload.single('learning_agreement_file'), async (req, res) => {
    const appId = req.params.id;
    const { exams, reason } = req.body;
    const file = req.file;
    let parsedExams = [];
    try { parsedExams = JSON.parse(exams); } catch (e) { }

    const connection = await dbPool.getConnection();
    try {
        await connection.beginTransaction();

        await connection.query(`UPDATE Applications SET status = 'AWAITING_MODIFICATION_APPROVAL' WHERE id = ?`, [appId]);

        await connection.query(`DELETE FROM ExamsMapping WHERE application_id = ? AND is_proposed_change = TRUE`, [appId]);

        for (const exam of parsedExams) {
            const isProposed = exam.is_proposed_change ? true : false;

            await connection.query(
                `INSERT INTO ExamsMapping (application_id, foreign_course_code, foreign_course_name, foreign_course_credits, unive_course_code, unive_course_title, unive_course_credits, is_proposed_change)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [appId, exam.foreignCode, exam.foreignName, exam.foreignCredits, exam.localCode, exam.localName, exam.localCredits, isProposed]
            );
        }

        if (file) {
            await connection.query(
                `INSERT INTO Documents (application_id, document_type, file_name, file_path, status, modification_description)
                 VALUES (?, 'LEARNING_AGREEMENT', ?, ?, 'PENDING', ?)`,
                [appId, file.originalname, '/uploads/' + file.filename, reason]
            );
        }

        await connection.commit();
        res.json({ message: "Proposta inviata con successo" });
    } catch (error) {
        await connection.rollback();
        console.error("Errore Modify-LA:", error);
        res.status(500).send("Errore server");
    } finally { connection.release(); }
});

// Erasmus Closure (Upload Transcript of Recors and Grades)
app.post('/api/applications/:id/tor', upload.single('tor_file'), async (req, res) => {
    const appId = req.params.id;
    const { exams } = req.body;
    const file = req.file;
    let parsedExams = [];
    try { parsedExams = JSON.parse(exams); } catch (e) { }

    const connection = await dbPool.getConnection();
    try {
        await connection.beginTransaction();

        await connection.query(`UPDATE Applications SET status = 'WAITING_FOR_EXAM_SCORE_APPROVAL' WHERE id = ?`, [appId]);
        await connection.query(`DELETE FROM ExamsMapping WHERE application_id = ?`, [appId]);

        for (const exam of parsedExams) {
            await connection.query(
                `INSERT INTO ExamsMapping (application_id, foreign_course_code, foreign_course_name, foreign_course_credits, unive_course_code, unive_course_title, unive_course_credits, score_obtained, exam_date) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [appId, exam.foreignCode, exam.foreignName, exam.foreignCredits, exam.localCode, exam.localName, exam.localCredits, exam.score, exam.date]
            );
        }

        if (file) {
            await connection.query(
                `INSERT INTO Documents (application_id, document_type, file_name, file_path, status) 
                 VALUES (?, 'TRANSCRIPT_OF_RECORDS', ?, ?, 'PENDING')`,
                [appId, file.originalname, '/uploads/' + file.filename]
            );
        }

        await connection.commit();
        res.json({ message: "Voti inviati" });
    } catch (error) {
        await connection.rollback();
        res.status(500).send("Errore server");
    } finally { connection.release(); }
});

// Re-Send Modification (REJECTED -> AWAITING_MODIFICATION_APPROVAL)
app.put('/api/applications/:id/resubmit-modification', upload.single('learning_agreement_file'), async (req, res) => {
    const appId = req.params.id;
    const { exams } = req.body;
    const file = req.file;
    let parsedExams = [];

    try {
        parsedExams = JSON.parse(exams);
    } catch (e) {
        console.error("Errore parsing JSON esami:", e);
    }

    const connection = await dbPool.getConnection();
    try {
        await connection.beginTransaction();

        await connection.query(
            `UPDATE Applications SET status = 'AWAITING_MODIFICATION_APPROVAL', la_rejection_reason = NULL WHERE id = ?`,
            [appId]
        );

        // Cancella le vecchie proposte rifiutate
        await connection.query(`DELETE FROM ExamsMapping WHERE application_id = ? AND is_proposed_change = TRUE`, [appId]);

        for (const exam of parsedExams) {
            const isProposed = exam.is_proposed_change ? true : false;

            const examDate = (exam.date && exam.date.trim() !== '') ? exam.date : null;
            const examScore = (exam.score && exam.score.trim() !== '') ? exam.score : null;

            await connection.query(
                `INSERT INTO ExamsMapping (application_id, foreign_course_code, foreign_course_name, foreign_course_credits, unive_course_code, unive_course_title, unive_course_credits, score_obtained, exam_date, is_proposed_change)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    appId,
                    exam.foreignCode || '',
                    exam.foreignName || '',
                    exam.foreignCredits || 0,
                    exam.localCode || '',
                    exam.localName || '',
                    exam.localCredits || 0,
                    examScore,
                    examDate,
                    isProposed
                ]
            );
        }

        if (file) {
            await connection.query(
                `INSERT INTO Documents (application_id, document_type, file_name, file_path, status)
                 VALUES (?, 'LEARNING_AGREEMENT', ?, ?, 'PENDING')`,
                [appId, file.originalname, '/uploads/' + file.filename]
            );
        }

        await connection.commit();
        res.json({ message: "Nuova revisione inviata con successo!" });
    } catch (error) {
        await connection.rollback();
        console.error("🔴 ERRORE CRITICO NEL SERVER (Resubmit):", error);
        res.status(500).send("Errore server durante il reinvio: " + error.message);
    } finally {
        connection.release();
    }
});

// ROTTE PER L'AREA DOCENTE (LECTURER DASHBOARD)

// 1. Recupera tutte le pratiche assegnate al docente loggato
app.get('/api/lecturer/applications', async (req, res) => {
    const lecturerEmail = req.query.email;
    if (!lecturerEmail) return res.status(400).send("Email mancante");

    try {
        const [rows] = await dbPool.query(`
            SELECT
                a.id, a.academic_year, a.mobility_period, a.status,
                i.name AS institution_name, i.country,
                s.first_name AS student_first_name, s.last_name AS student_last_name,
                (SELECT COUNT(*) FROM Documents d WHERE d.application_id = a.id AND d.status = 'PENDING') AS pending_docs
            FROM Applications a
                     JOIN Institutions i ON a.institution_id = i.id
                     JOIN Users s ON a.student_id = s.id
                     JOIN Users l ON a.lecturer_id = l.id
            WHERE l.email = ?
            ORDER BY a.updated_at DESC
        `, [lecturerEmail]);
        res.json(rows);
    } catch (error) {
        console.error("Errore recupero pratiche docente:", error);
        res.status(500).send("Errore interno");
    }
});

// 2. Approva o Rifiuta un documento (L.A. o ToR)
app.put('/api/lecturer/applications/:id/review', async (req, res) => {
    const appId = req.params.id;
    // action sarà 'APPROVE' o 'REJECT'
    const { document_type, action, rejection_reason } = req.body;

    const connection = await dbPool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Aggiorna lo stato del singolo documento in sospeso
        await connection.query(`
            UPDATE Documents 
            SET status = ?, decision_date = CURDATE(), rejection_reason = ? 
            WHERE application_id = ? AND document_type = ? AND status = 'PENDING'
            ORDER BY upload_date DESC LIMIT 1
        `, [action === 'APPROVE' ? 'APPROVED' : 'REJECTED', rejection_reason || null, appId, document_type]);

        // 2. Se APPROVATO, fa progredire lo stato dell'intera pratica
        if (action === 'APPROVE') {
            if (document_type === 'LEARNING_AGREEMENT') {
                // Verifichiamo se era un LA iniziale o una modifica
                const [app] = await connection.query(`SELECT status FROM Applications WHERE id = ?`, [appId]);
                const currentStatus = app[0].status;
                const newStatus = (currentStatus === 'AWAITING_MODIFICATION_APPROVAL')
                    ? 'MOBILITY_IN_PROGRESS'
                    : 'PRE_DEPARTURE_COMPLETED';

                await connection.query(`
                    UPDATE Applications 
                    SET status = ?, is_la_approved = TRUE, la_decision_date = CURDATE(), la_rejection_reason = NULL 
                    WHERE id = ?`, [newStatus, appId]);

                // Consolida gli esami
                await connection.query(`
                    UPDATE ExamsMapping 
                    SET is_approved_by_lecturer = TRUE, is_proposed_change = FALSE 
                    WHERE application_id = ?`, [appId]);
            }
            else if (document_type === 'TRANSCRIPT_OF_RECORDS') {
                // Chiude la pratica con successo
                await connection.query(`
                    UPDATE Applications 
                    SET status = 'CLOSED', are_exams_approved = TRUE 
                    WHERE id = ?`, [appId]);
            }
        }
        // Se RIFIUTATO, il documento risulta REJECTED e lo studente lo vedrà, abilitando il tasto di reinvio.

        await connection.commit();
        res.json({ message: "Revisione completata con successo" });
    } catch (error) {
        await connection.rollback();
        console.error("Errore durante la review del docente:", error);
        res.status(500).send("Errore server");
    } finally {
        connection.release();
    }
});

app.listen(3000, () => {
    console.log('Backend in ascolto sulla porta 3000');
});