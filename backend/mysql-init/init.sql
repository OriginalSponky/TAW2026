USE app_database;

CREATE TABLE Users (
                       id INT AUTO_INCREMENT PRIMARY KEY,
                       role ENUM('STUDENT', 'LECTURER', 'STAFF') NOT NULL,
                       first_name VARCHAR(100) NOT NULL,
                       last_name VARCHAR(100) NOT NULL,
                       matriculation_number VARCHAR(20) UNIQUE,
                       email VARCHAR(150) NOT NULL UNIQUE,
                       password_hash VARCHAR(255) NOT NULL,
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Institutions (
                              id INT AUTO_INCREMENT PRIMARY KEY,
                              name VARCHAR(255) NOT NULL,
                              country VARCHAR(100) NOT NULL,
                              city VARCHAR(100) NOT NULL,
                              website_url VARCHAR(255)
);

CREATE TABLE Applications (
                              id INT AUTO_INCREMENT PRIMARY KEY,
                              student_id INT NOT NULL,
                              institution_id INT NOT NULL,
                              lecturer_id INT NOT NULL,

    -- DATI ESSENZIALI
                              academic_year VARCHAR(9) NOT NULL, -- es "2025/2026"
                              mobility_period ENUM('FIRST_SEMESTER', 'SECOND_SEMESTER', 'FULL_YEAR') NOT NULL,

    -- DATE EFFETTIVE
                              actual_arrival_date DATE NULL,
                              actual_departure_date DATE NULL,

    -- STATO DELLA RICHIESTA
                              status ENUM(
                                  'CREATED',
                                  'AWAITING_FOR_APPROVAL',
                                  'PRE_DEPARTURE_COMPLETED',
                                  'MOBILITY_IN_PROGRESS',
                                  'AWAITING_MODIFICATION_APPROVAL',
                                  'WAITING_FOR_EXAM_SCORE_APPROVAL',
                                  'CLOSED',
                                  'CANCELED'
                                  ) DEFAULT 'CREATED',

    -- APPROVAZIONI DEL LEARNING AGREEMENT E DEI VOTI
                              is_la_approved BOOLEAN DEFAULT FALSE,
                              la_decision_date DATE NULL,
                              la_rejection_reason TEXT NULL,
                              are_exams_approved BOOLEAN DEFAULT FALSE,

    -- DATE DI SISTEMA
                              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                              FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE CASCADE,
                              FOREIGN KEY (institution_id) REFERENCES Institutions(id) ON DELETE RESTRICT,
                              FOREIGN KEY (lecturer_id) REFERENCES Users(id) ON DELETE RESTRICT
);

CREATE TABLE ExamsMapping (
                              id INT AUTO_INCREMENT PRIMARY KEY,
                              application_id INT NOT NULL,

    -- DATI DEL CORSO ESTERO
                              foreign_course_code VARCHAR(50) NOT NULL,
                              foreign_course_name VARCHAR(255) NOT NULL,
                              foreign_course_credits INT NOT NULL,

    -- DATI DEL CORSO A CA' FOSCARI
                              unive_course_code VARCHAR(50) NOT NULL,
                              unive_course_title VARCHAR(255) NOT NULL,
                              unive_course_credits INT NOT NULL,

                              score_obtained VARCHAR(10) NULL,
                              exam_date DATE NULL,
                              is_proposed_change BOOLEAN DEFAULT FALSE,

    -- APPROVAZIONE DEL SINGOLO ESAME
                              is_approved_by_lecturer BOOLEAN DEFAULT FALSE,

                              FOREIGN KEY (application_id) REFERENCES Applications(id) ON DELETE CASCADE
);

CREATE TABLE Documents (
                           id INT AUTO_INCREMENT PRIMARY KEY,
                           application_id INT NOT NULL,

    -- Tipo di documento
                           document_type ENUM('LEARNING_AGREEMENT', 'TRANSCRIPT_OF_RECORDS') NOT NULL,

    -- Dati del file fisico salvato sul server
                           file_name VARCHAR(255) NOT NULL,
                           file_path VARCHAR(255) NOT NULL,
                           modification_description TEXT NULL,

    -- Tracciamento per ogni singola versione del documento
                           status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
                           decision_date DATE NULL,
                           rejection_reason TEXT NULL,
                           upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                           FOREIGN KEY (application_id) REFERENCES Applications(id) ON DELETE CASCADE
);


-- ---------------------------------------------------------
-- INSERIMENTO DATI DI ESEMPIO (SEEDING) - VERSIONE COMPLETA
-- ---------------------------------------------------------

-- 1. Popoliamo gli Utenti
INSERT INTO Users (role, first_name, last_name, matriculation_number, email, password_hash) VALUES
                                                                                                ('STUDENT', 'Student', 'Test', '000067', '000067@stud.unive.it', 'student_test'),
                                                                                                ('LECTURER', 'Lecturer', 'Test', NULL, 'lecturer.test@unive.it', 'lecturer_test'),
                                                                                                ('STAFF', 'Overseas', 'Office', NULL, 'overseaout@unive.it', 'staff_test');

-- 2. Popoliamo le Istituzioni Estere
INSERT INTO Institutions (name, country, city, website_url) VALUES
                                                                ('Universidad de Barcelona', 'Spagna', 'Barcellona', 'https://www.ub.edu'),
                                                                ('Technical University of Munich', 'Germania', 'Monaco', 'https://www.tum.de');

-- 3. Creiamo le 8 Domande di Mobilità (Aggiunta la colonna la_rejection_reason e la pratica 8 per testare il rifiuto)
INSERT INTO Applications (id, student_id, institution_id, lecturer_id, academic_year, mobility_period, status, is_la_approved, la_rejection_reason) VALUES
                                                                                                                                                        (1, 1, 1, 2, '2025/2026', 'FIRST_SEMESTER', 'MOBILITY_IN_PROGRESS', TRUE, NULL),
                                                                                                                                                        (2, 1, 2, 2, '2026/2027', 'SECOND_SEMESTER', 'CREATED', FALSE, NULL),
                                                                                                                                                        (3, 1, 1, 2, '2026/2027', 'FULL_YEAR', 'AWAITING_FOR_APPROVAL', FALSE, NULL),
                                                                                                                                                        (4, 1, 2, 2, '2025/2026', 'FIRST_SEMESTER', 'PRE_DEPARTURE_COMPLETED', TRUE, NULL),
                                                                                                                                                        (5, 1, 1, 2, '2025/2026', 'SECOND_SEMESTER', 'WAITING_FOR_EXAM_SCORE_APPROVAL', TRUE, NULL),
                                                                                                                                                        (6, 1, 2, 2, '2024/2025', 'FULL_YEAR', 'CLOSED', TRUE, NULL),
                                                                                                                                                        (7, 1, 1, 2, '2025/2026', 'SECOND_SEMESTER', 'CANCELED', FALSE, NULL),
                                                                                                                                                        (8, 1, 1, 2, '2025/2026', 'SECOND_SEMESTER', 'MOBILITY_IN_PROGRESS', FALSE, 'Attenzione: Il corso UB-ART202 (Historia del Arte) non è in linea con il tuo piano di studi di Informatica. Ti prego di sostituirlo con un corso pertinente (es. UX Design o Database) e reinviare la proposta.');

-- 4. Creiamo la Mappatura degli Esami per ogni richiesta
INSERT INTO ExamsMapping (application_id, foreign_course_code, foreign_course_name, foreign_course_credits, unive_course_code, unive_course_title, unive_course_credits, score_obtained, is_approved_by_lecturer) VALUES
-- App 1 (MOBILITY_IN_PROGRESS)
(1, 'UB-INF101', 'Desarrollo Web Avanzado', 6.0, 'CM0123', 'Tecnologie e Applicazioni Web', 6, '28', TRUE),
(1, 'UB-INF102', 'Introducción a la Programación', 6.0, 'CM0456', 'Introduzione alla Programmazione', 6, NULL, FALSE),
(1, 'UB-DSG200', 'Diseño de Interfaz de Usuario', 6.0, 'CM0789', 'UX Design', 6, '30', TRUE),
-- App 2 (CREATED)
(2, 'TUM-CS101', 'Algorithms and Data Structures', 8.0, 'CM0111', 'Algoritmi e Strutture Dati', 6, NULL, FALSE),
-- App 3 (AWAITING_FOR_APPROVAL)
(3, 'UB-MAT101', 'Álgebra Lineal', 6.0, 'CM0222', 'Algebra Lineare', 6, NULL, FALSE),
-- App 4 (PRE_DEPARTURE_COMPLETED)
(4, 'TUM-CS201', 'Operating Systems', 6.0, 'CM0333', 'Sistemi Operativi', 6, NULL, TRUE),
-- App 5 (WAITING_FOR_EXAM_SCORE_APPROVAL)
(5, 'UB-INF301', 'Inteligencia Artificial', 6.0, 'CM0444', 'Intelligenza Artificiale', 6, '29', TRUE),
-- App 6 (CLOSED)
(6, 'TUM-CS301', 'Computer Networks', 6.0, 'CM0555', 'Reti di Calcolatori', 6, '27', TRUE),
(6, 'TUM-CS302', 'Database Systems', 6.0, 'CM0666', 'Basi di Dati', 6, '30', TRUE),
-- App 7 (CANCELED)
(7, 'UB-INF401', 'Seguridad Informática', 6.0, 'CM0777', 'Sicurezza Informatica', 6, NULL, FALSE),
-- App 8 (PRATICA RIFIUTATA DA TESTARE)
(8, 'UB-INF101', 'Desarrollo Web Avanzado', 6.0, 'CM0123', 'Tecnologie e Applicazioni Web', 6, NULL, FALSE),
(8, 'UB-ART202', 'Historia del Arte Contemporáneo', 6.0, 'CM0999', 'Esame a Scelta Libera', 6, NULL, FALSE);

-- 5. Inseriamo i Documenti
INSERT INTO Documents (application_id, document_type, file_name, file_path, status) VALUES
-- App 1: Documento che genererà errore (il file non esiste fisicamente)
(1, 'LEARNING_AGREEMENT', 'LA_Bianchi_Filippo_Signed.pdf', '/uploads/docs/1/LA_Bianchi_Filippo_Signed.pdf', 'APPROVED'),
-- App 3: Documento caricato ma in attesa di approvazione
(3, 'LEARNING_AGREEMENT', 'LA_Test_Awaiting.pdf', '/uploads/docs/3/test.pdf', 'PENDING'),
-- App 4: Learning Agreement Approvato
(4, 'LEARNING_AGREEMENT', 'LA_Test_PreDep.pdf', '/uploads/docs/4/test.pdf', 'APPROVED'),
-- App 5: LA Approvato + Transcript of Records caricato
(5, 'LEARNING_AGREEMENT', 'LA_Test_Waiting.pdf', '/uploads/docs/5/test_la.pdf', 'APPROVED'),
(5, 'TRANSCRIPT_OF_RECORDS', 'ToR_Test_Waiting.pdf', '/uploads/docs/5/test_tor.pdf', 'PENDING'),
-- App 6: Entrambi i documenti approvati
(6, 'LEARNING_AGREEMENT', 'LA_Test_Closed.pdf', '/uploads/docs/6/test_la.pdf', 'APPROVED'),
(6, 'TRANSCRIPT_OF_RECORDS', 'ToR_Test_Closed.pdf', '/uploads/docs/6/test_tor.pdf', 'APPROVED'),
-- App 8: Documento rifiutato
(8, 'LEARNING_AGREEMENT', 'LA_Test_Errato.pdf', '/uploads/docs/8/LA_Test_Errato.pdf', 'REJECTED');