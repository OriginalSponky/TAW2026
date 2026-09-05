/* ==========================================================================
   OVERSEAS PROGRAM - BACKEND API (Node.js & Express)
   Questo file gestisce l'intero ecosistema lato server: Autenticazione,
   CRUD delle Applications, Upload Documentale, e le logiche di Business
   (State Machine) per Studenti, Docenti e Staff.
   ========================================================================== */

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();

// ==========================================
// 1. CONFIGURAZIONI GLOBALI (Middleware)
// ==========================================
app.use(cors()); // Abilita le chiamate cross-origin (da Angular a Express)
app.use(express.json()); // Permette al server di interpretare il corpo delle richieste in JSON

// ==========================================
// 2. CONFIGURAZIONE UPLOAD FILE (Multer)
// ==========================================
const uploadDir = path.join(__dirname, 'uploads');
// Crea la cartella se non esiste al primo avvio
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Definisce dove e come vengono salvati i file PDF (con un suffisso unico per evitare collisioni)
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

// Espone la cartella '/uploads' al web per permettere il download dei PDF generati
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// 3. CONFIGURAZIONE DATABASE (MySQL Pool)
// ==========================================
const dbPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: 'express_user',
    password: 'root',
    database: 'app_database',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

/* ==========================================================================
   SEZIONE A: AUTENTICAZIONE E REGISTRAZIONE
   ========================================================================== */

/**
 * LOGIN TRADIZIONALE
 * Supporta sia password criptate (nuovi utenti) che testo in chiaro (vecchi account di seed)
 */
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [rows] = await dbPool.query('SELECT * FROM Users WHERE email = ?', [email]);

        if (rows.length > 0) {
            const user = rows[0];
            let passwordCorretta = false;

            if (user.password_hash && user.password_hash.startsWith('$2')) {
                passwordCorretta = await bcrypt.compare(password, user.password_hash);
            } else {
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
            // Se l'utente non esiste ma ha un'email universitaria, richiede la registrazione
            if (email.endsWith('@stud.unive.it') || email.endsWith('@unive.it')) {
                const isStudent = email.endsWith('@stud.unive.it');
                res.json({
                    action: 'REQUIRES_REGISTRATION',
                    prefill: {
                        email: email,
                        role: isStudent ? 'STUDENT' : 'LECTURER',
                        matriculation_number: isStudent ? email.split('@')[0] : null,
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

/**
 * GOOGLE LOGIN (SSO)
 */
app.post('/api/google-login', async (req, res) => {
    const { email, given_name, family_name } = req.body;

    try {
        const [rows] = await dbPool.query('SELECT * FROM Users WHERE email = ?', [email]);

        if (rows.length > 0) {
            const user = rows[0];
            res.json({
                action: 'LOGIN',
                user: {
                    first_name: user.first_name,
                    last_name: user.last_name,
                    role: user.role,
                    matriculation_number: email.split('@')[0]
                }
            });
        } else {
            if (email.endsWith('@stud.unive.it') || email.endsWith('@unive.it')) {
                const isStudent = email.endsWith('@stud.unive.it');
                res.json({
                    action: 'REQUIRES_REGISTRATION',
                    prefill: {
                        email: email,
                        role: isStudent ? 'STUDENT' : 'LECTURER',
                        matriculation_number: isStudent ? email.split('@')[0] : null,
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

/**
 * REGISTRAZIONE NUOVO UTENTE
 */
app.post('/api/register', async (req, res) => {
    const { email, password, first_name, last_name, role, matriculation_number } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

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

/* ==========================================================================
   SEZIONE B: ROTTE DI SUPPORTO (Dizionari e Anagrafiche)
   ========================================================================== */

app.get('/api/institutions', async (req, res) => {
    try {
        const [rows] = await dbPool.query('SELECT id, name, country FROM Institutions');
        res.json(rows);
    } catch (error) {
        res.status(500).send("Errore DB Istituzioni");
    }
});

app.get('/api/lecturers', async (req, res) => {
    try {
        const [rows] = await dbPool.query("SELECT id, first_name, last_name FROM Users WHERE role = 'LECTURER'");
        res.json(rows);
    } catch (error) {
        res.status(500).send("Errore DB Professori");
    }
});


/* ==========================================================================
   SEZIONE C: LOGICA STUDENTE (CRUD Applications)
   ========================================================================== */

/**
 * OTTIENI TUTTE LE RICHIESTE DI UNO STUDENTE
 */
app.get('/api/applications', async (req, res) => {
    const studentEmail = req.query.email;
    if (!studentEmail) return res.status(400).send("Email mancante");

    try {
        const [rows] = await dbPool.query(`
            SELECT a.id, a.academic_year, a.mobility_period, a.status, i.name AS institution_name
            FROM Applications a
            JOIN Institutions i ON a.institution_id = i.id
            JOIN Users student ON a.student_id = student.id
            WHERE student.email = ?
            ORDER BY a.created_at DESC
        `, [studentEmail]);
        res.json(rows);
    } catch (error) {
        res.status(500).send("Errore interno");
    }
});

/**
 * OTTIENI IL DETTAGLIO COMPLETO DI UNA PRATICA
 */
app.get('/api/applications/:id', async (req, res) => {
    const appId = req.params.id;
    try {
        const [appRows] = await dbPool.query(`
            SELECT a.*, i.name AS institution_name, i.country, i.city, i.website_url
            FROM Applications a
            JOIN Institutions i ON a.institution_id = i.id
            WHERE a.id = ?
        `, [appId]);

        if (appRows.length === 0) return res.status(404).send("Richiesta non trovata");
        const applicationData = appRows[0];

        const [examRows] = await dbPool.query(`SELECT * FROM ExamsMapping WHERE application_id = ?`, [appId]);
        applicationData.exams = examRows;

        const [docRows] = await dbPool.query(`SELECT * FROM Documents WHERE application_id = ?`, [appId]);
        applicationData.documents = docRows;

        res.json(applicationData);
    } catch (error) {
        res.status(500).send("Errore interno");
    }
});

/**
 * CREA UNA NUOVA RICHIESTA (Bozza/CREATED)
 */
app.post('/api/applications', upload.single('learning_agreement_file'), async (req, res) => {
    const { student_email, institution_id, lecturer_id, academic_year, mobility_period, exams } = req.body;
    const file = req.file;

    let parsedExams = [];
    try { parsedExams = JSON.parse(exams); } catch (e) {}

    const connection = await dbPool.getConnection();
    try {
        await connection.beginTransaction();

        const [users] = await connection.query('SELECT id FROM Users WHERE email = ?', [student_email]);
        if (users.length === 0) throw new Error("Studente non trovato nel database.");

        const [appResult] = await connection.query(
            `INSERT INTO Applications (student_id, institution_id, lecturer_id, academic_year, mobility_period, status)
             VALUES (?, ?, ?, ?, ?, 'CREATED')`,
            [users[0].id, institution_id, lecturer_id, academic_year, mobility_period]
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
            await connection.query(
                `INSERT INTO Documents (application_id, document_type, file_name, file_path, status)
                 VALUES (?, 'LEARNING_AGREEMENT', ?, ?, 'PENDING')`,
                [applicationId, file.originalname, '/uploads/' + file.filename]
            );
        }

        await connection.commit();
        res.json({ message: "Richiesta creata con successo!", applicationId });
    } catch (error) {
        await connection.rollback();
        res.status(500).send("Errore interno durante il salvataggio.");
    } finally {
        connection.release();
    }
});

/**
 * AGGIORNA UNA BOZZA ESISTENTE (Cancellazione e reinserimento dati e documenti)
 */
app.put('/api/applications/:id', upload.single('learning_agreement_file'), async (req, res) => {
    const appId = req.params.id;
    const { institution_id, lecturer_id, academic_year, mobility_period, exams } = req.body;
    const file = req.file;

    let parsedExams = [];
    try { parsedExams = JSON.parse(exams); } catch (e) {}

    const connection = await dbPool.getConnection();
    try {
        await connection.beginTransaction();

        await connection.query(
            `UPDATE Applications SET institution_id = ?, lecturer_id = ?, academic_year = ?, mobility_period = ? WHERE id = ?`,
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

        if (file) {
            await connection.query(`DELETE FROM Documents WHERE application_id = ? AND document_type = 'LEARNING_AGREEMENT'`, [appId]);
            await connection.query(
                `INSERT INTO Documents (application_id, document_type, file_name, file_path, status)
                 VALUES (?, 'LEARNING_AGREEMENT', ?, ?, 'PENDING')`,
                [appId, file.originalname, '/uploads/' + file.filename]
            );
        }

        await connection.commit();
        res.json({ message: "Application updated successfully!" });
    } catch (error) {
        await connection.rollback();
        res.status(500).send("Internal server error during update");
    } finally {
        connection.release();
    }
});

/**
 * ELIMINA DEFINITIVAMENTE UNA PRATICA
 */
app.delete('/api/applications/:id', async (req, res) => {
    try {
        await dbPool.query('DELETE FROM Applications WHERE id = ?', [req.params.id]);
        res.json({ message: 'Application deleted successfully' });
    } catch (error) {
        res.status(500).send("Internal server error during deletion");
    }
});

/* ==========================================================================
   SEZIONE D: ACTIVE MOBILITY (Gestione in Itinere dello Studente)
   ========================================================================== */

/**
 * INSERIMENTO O AGGIORNAMENTO DELLE DATE EFFETTIVE (Start Mobility)
 */
app.put('/api/applications/:id/dates', async (req, res) => {
    const appId = req.params.id;
    const { arrival_date, departure_date, start_mobility } = req.body;
    const connection = await dbPool.getConnection();

    try {
        await connection.beginTransaction();

        const dbArrival = (arrival_date && arrival_date.trim() !== '') ? arrival_date : null;
        const dbDeparture = (departure_date && departure_date.trim() !== '') ? departure_date : null;

        if (start_mobility) {
            await connection.query(
                `UPDATE Applications SET actual_arrival_date = ?, actual_departure_date = ?, status = 'MOBILITY_IN_PROGRESS' WHERE id = ?`,
                [dbArrival, dbDeparture, appId]
            );
        } else {
            await connection.query(
                `UPDATE Applications SET actual_arrival_date = ?, actual_departure_date = ? WHERE id = ?`,
                [dbArrival, dbDeparture, appId]
            );
        }

        await connection.commit();
        res.json({ message: "Date salvate con successo nel database!" });
    } catch (error) {
        await connection.rollback();
        res.status(500).send("Errore del server durante il salvataggio delle date");
    } finally {
        connection.release();
    }
});

/**
 * RINUNCIA ALLA MOBILITA'
 */
app.put('/api/applications/:id/cancel', async (req, res) => {
    try {
        await dbPool.query(`UPDATE Applications SET status = 'CANCELED' WHERE id = ?`, [req.params.id]);
        res.json({ message: 'Mobilità annullata' });
    } catch (error) {
        res.status(500).send("Errore durante l'annullamento");
    }
});

/**
 * PROPONI UNA MODIFICA AL LEARNING AGREEMENT (Awaiting Modification Approval)
 */
app.put('/api/applications/:id/modify-la', upload.single('learning_agreement_file'), async (req, res) => {
    const appId = req.params.id;
    const { exams, reason } = req.body;
    const file = req.file;
    let parsedExams = [];
    try { parsedExams = JSON.parse(exams); } catch (e) {}

    const connection = await dbPool.getConnection();
    try {
        await connection.beginTransaction();

        await connection.query(`UPDATE Applications SET status = 'AWAITING_MODIFICATION_APPROVAL' WHERE id = ?`, [appId]);
        await connection.query(`DELETE FROM ExamsMapping WHERE application_id = ? AND is_proposed_change = TRUE`, [appId]);

        for (const exam of parsedExams) {
            await connection.query(
                `INSERT INTO ExamsMapping (application_id, foreign_course_code, foreign_course_name, foreign_course_credits, unive_course_code, unive_course_title, unive_course_credits, is_proposed_change)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [appId, exam.foreignCode, exam.foreignName, exam.foreignCredits, exam.localCode, exam.localName, exam.localCredits, exam.is_proposed_change ? true : false]
            );
        }

        const fileName = file ? file.originalname : 'Modifica Piano di Studi (Nessun File)';
        const filePath = file ? '/uploads/' + file.filename : '#';

        await connection.query(
            `INSERT INTO Documents (application_id, document_type, file_name, file_path, status, modification_description)
             VALUES (?, 'LEARNING_AGREEMENT', ?, ?, 'PENDING', ?)`,
            [appId, fileName, filePath, reason]
        );

        await connection.commit();
        res.json({ message: "Proposta inviata con successo" });
    } catch (error) {
        await connection.rollback();
        res.status(500).send("Errore server");
    } finally { connection.release(); }
});

/**
 * INVIA IL TRANSCRIPT OF RECORDS E CHIUDI L'ERASMUS (Awaiting Exam Score Approval)
 */
app.post('/api/applications/:id/tor', upload.single('tor_file'), async (req, res) => {
    const appId = req.params.id;
    const { exams } = req.body;
    const file = req.file;
    let parsedExams = [];
    try { parsedExams = JSON.parse(exams); } catch (e) {}

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

/**
 * RE-INVIA UNA MODIFICA RIFIUTATA (Correzione Errore Docente)
 */
app.put('/api/applications/:id/resubmit-modification', upload.single('learning_agreement_file'), async (req, res) => {
    const appId = req.params.id;
    const { exams } = req.body;
    const file = req.file;
    let parsedExams = [];
    try { parsedExams = JSON.parse(exams); } catch (e) {}

    const connection = await dbPool.getConnection();
    try {
        await connection.beginTransaction();

        await connection.query(`UPDATE Applications SET status = 'AWAITING_MODIFICATION_APPROVAL', la_rejection_reason = NULL WHERE id = ?`, [appId]);
        await connection.query(`DELETE FROM ExamsMapping WHERE application_id = ? AND is_proposed_change = TRUE`, [appId]);

        for (const exam of parsedExams) {
            const isProposed = exam.is_proposed_change ? true : false;
            await connection.query(
                `INSERT INTO ExamsMapping (application_id, foreign_course_code, foreign_course_name, foreign_course_credits, unive_course_code, unive_course_title, unive_course_credits, score_obtained, exam_date, is_proposed_change)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [appId, exam.foreignCode || '', exam.foreignName || '', exam.foreignCredits || 0, exam.localCode || '', exam.localName || '', exam.localCredits || 0, exam.score || null, exam.date || null, isProposed]
            );
        }

        const fileName = file ? file.originalname : 'Modifica Piano di Studi (Nessun File)';
        const filePath = file ? '/uploads/' + file.filename : '#';

        await connection.query(
            `INSERT INTO Documents (application_id, document_type, file_name, file_path, status)
             VALUES (?, 'LEARNING_AGREEMENT', ?, ?, 'PENDING')`,
            [appId, fileName, filePath]
        );

        await connection.commit();
        res.json({ message: "Nuova revisione inviata con successo!" });
    } catch (error) {
        await connection.rollback();
        res.status(500).send("Errore server durante il reinvio");
    } finally { connection.release(); }
});

/* ==========================================================================
   SEZIONE E: LOGICA DOCENTE (Lecturer Dashboard)
   ========================================================================== */

/**
 * Recupera l'intero archivio e lo storico assegnato ad uno specifico Docente
 */
app.get('/api/lecturer/applications', async (req, res) => {
    const lecturerEmail = req.query.email;
    if (!lecturerEmail) return res.status(400).send("Email mancante");

    try {
        const [rows] = await dbPool.query(`
            SELECT
                a.id, a.academic_year, a.mobility_period, a.status,
                a.actual_arrival_date, a.actual_departure_date,
                i.name AS institution_name, i.country,
                s.first_name AS student_first_name, s.last_name AS student_last_name,
                s.matriculation_number AS matricola,
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
        res.status(500).send("Errore interno");
    }
});

/**
 * VALUTAZIONE DOCENTE (Azzera i PENDING, aggiorna la State Machine dell'Application)
 */
app.put('/api/lecturer/applications/:id/review', async (req, res) => {
    const appId = req.params.id;
    const { document_type, action, rejection_reason } = req.body;

    const connection = await dbPool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Pulizia dei vecchi file APPROVED per evitare doppioni
        if (action === 'APPROVE') {
            const [pendingDocs] = await connection.query(`
                SELECT id, file_path FROM Documents 
                WHERE application_id = ? AND document_type = ? AND status = 'PENDING'
                ORDER BY upload_date DESC LIMIT 1
            `, [appId, document_type]);

            if (pendingDocs.length > 0) {
                const pendingDoc = pendingDocs[0];
                if (pendingDoc.file_path === '#') {
                    const [oldApprovedDocs] = await connection.query(`
                        SELECT file_name, file_path FROM Documents 
                        WHERE application_id = ? AND document_type = ? AND status = 'APPROVED'
                        ORDER BY upload_date DESC LIMIT 1
                    `, [appId, document_type]);

                    if (oldApprovedDocs.length > 0) {
                        const oldDoc = oldApprovedDocs[0];
                        await connection.query(`UPDATE Documents SET file_name = ?, file_path = ? WHERE id = ?`,
                            [oldDoc.file_name, oldDoc.file_path, pendingDoc.id]);
                    }
                }
                await connection.query(`DELETE FROM Documents WHERE application_id = ? AND document_type = ? AND status = 'APPROVED'`,
                    [appId, document_type]);
            }
        }

        // 2. Modifica stato documento PENDING attuale
        await connection.query(`
            UPDATE Documents
            SET status = ?, decision_date = CURDATE(), rejection_reason = ?
            WHERE application_id = ? AND document_type = ? AND status = 'PENDING'
            ORDER BY upload_date DESC LIMIT 1
        `, [action === 'APPROVE' ? 'APPROVED' : 'REJECTED', rejection_reason || null, appId, document_type]);

        const [app] = await connection.query(`SELECT status FROM Applications WHERE id = ?`, [appId]);
        const currentStatus = app[0].status;

        // 3. Spostamento in avanti della State Machine per l'Application
        if (action === 'APPROVE') {
            if (document_type === 'LEARNING_AGREEMENT' || document_type === 'LEARning_AGREEMENT') {
                const newStatus = (currentStatus === 'AWAITING_MODIFICATION_APPROVAL') ? 'MOBILITY_IN_PROGRESS' : 'PRE_DEPARTURE_COMPLETED';
                await connection.query(`UPDATE Applications SET status = ?, is_la_approved = TRUE, la_decision_date = CURDATE(), la_rejection_reason = NULL WHERE id = ?`, [newStatus, appId]);

                if (currentStatus === 'AWAITING_MODIFICATION_APPROVAL') {
                    await connection.query(`DELETE FROM ExamsMapping WHERE application_id = ? AND is_proposed_change = FALSE`, [appId]);
                }
                await connection.query(`UPDATE ExamsMapping SET is_approved_by_lecturer = TRUE, is_proposed_change = FALSE WHERE application_id = ?`, [appId]);
            }
            else if (document_type === 'TRANSCRIPT_OF_RECORDS') {
                await connection.query(`UPDATE Applications SET status = 'EXAM_SCORES_APPROVED', are_exams_approved = TRUE WHERE id = ?`, [appId]);
                await connection.query(`UPDATE ExamsMapping SET is_approved_by_lecturer = TRUE WHERE application_id = ?`, [appId]);
            }
        }
        else if (action === 'REJECT') {
            if (document_type === 'LEARNING_AGREEMENT' && currentStatus === 'AWAITING_MODIFICATION_APPROVAL') {
                await connection.query(`DELETE FROM ExamsMapping WHERE application_id = ? AND is_proposed_change = TRUE`, [appId]);
                await connection.query(`UPDATE Applications SET status = 'MOBILITY_IN_PROGRESS' WHERE id = ?`, [appId]);
            }
        }

        await connection.commit();
        res.json({ message: "Revisione completata con successo" });
    } catch (error) {
        await connection.rollback();
        res.status(500).send("Errore server");
    } finally {
        connection.release();
    }
});

/**
 * ACCETTAZIONE RAPIDA DELLA BOZZA (Senza file)
 */
app.put('/api/lecturer/applications/:id/draft-review', async (req, res) => {
    const { action, rejection_reason } = req.body;
    try {
        if (action === 'APPROVE') {
            await dbPool.query(`UPDATE Applications SET status = 'AWAITING_FOR_APPROVAL' WHERE id = ?`, [req.params.id]);
            res.json({ message: 'Richiesta accettata e passata in attesa di L.A.' });
        } else if (action === 'REJECT') {
            await dbPool.query(`UPDATE Applications SET status = 'CANCELED', la_rejection_reason = ? WHERE id = ?`, [rejection_reason, req.params.id]);
            res.json({ message: 'Bozza rifiutata' });
        } else {
            res.status(400).send("Azione non valida");
        }
    } catch (error) {
        res.status(500).send("Errore server");
    }
});

/* ==========================================================================
   SEZIONE F: LOGICA STAFF (Ufficio Mobilità Internazionale)
   ========================================================================== */

/**
 * Ottiene la panoramica globale di tutto l'Ateneo
 */
app.get('/api/staff/applications', async (req, res) => {
    try {
        const [rows] = await dbPool.query(`
            SELECT
                a.id, a.academic_year, a.mobility_period, a.status,
                a.actual_arrival_date, a.actual_departure_date,
                i.name AS institution, i.country,
                s.first_name AS student_first_name, s.last_name AS student_last_name, s.matriculation_number AS matricola,
                l.email AS teacher,
                (SELECT COUNT(*) FROM Documents d WHERE d.application_id = a.id AND d.status = 'PENDING') AS pending_docs
            FROM Applications a
            JOIN Institutions i ON a.institution_id = i.id
            JOIN Users s ON a.student_id = s.id
            JOIN Users l ON a.lecturer_id = l.id
            ORDER BY a.updated_at DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).send("Errore interno");
    }
});

/**
 * Approvazione Finale Staff (Trigger delle partenze e delle chiusure definitive)
 */
app.put('/api/staff/applications/:id/review', async (req, res) => {
    const appId = req.params.id;
    const { action, actionType, rejection_reason } = req.body;

    try {
        let newStatus;
        if (actionType === 'pre-departure') {
            newStatus = action === 'APPROVE' ? 'MOBILITY_IN_PROGRESS' : 'CANCELED';
        } else if (actionType === 'closure') {
            newStatus = action === 'APPROVE' ? 'CLOSED' : 'CANCELED';
        }

        await dbPool.query(
            `UPDATE Applications SET status = ?, la_rejection_reason = ? WHERE id = ?`,
            [newStatus, rejection_reason || null, appId]
        );
        res.json({ message: "Pratica processata dall'ufficio con successo." });
    } catch (error) {
        res.status(500).send("Errore server");
    }
});

// ==========================================
// AVVIO DEL SERVER
// ==========================================
app.listen(3000, () => {
    console.log('Overseas Backend in ascolto sulla porta 3000 🚀');
});