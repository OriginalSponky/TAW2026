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

INSERT INTO Users (role, first_name, last_name, matriculation_number, email, password_hash) VALUES
-- Profili di TEST (ID 1, 2, 3)
('STUDENT', 'Student', 'Test', '000067', '000067@stud.unive.it', 'student_test'),
('LECTURER', 'Lecturer', 'Test', NULL, 'lecturer.test@unive.it', 'lecturer_test'),
('STAFF', 'Overseas', 'Office', NULL, 'overseasout@unive.it', 'staff_test'),
-- Altri utenti per verificare che i dati non si accavallino (ID 4, 5, 6)
('STUDENT', 'Alice', 'Meraviglia', '845001', '845001@stud.unive.it', 'password123'),
('STUDENT', 'Bob', 'Aggiustatutto', '845002', '845002@stud.unive.it', 'password123'),
('LECTURER', 'Mario', 'Rossi', NULL, 'm.rossi@unive.it', 'password123');

INSERT INTO Institutions (name, country, city, website_url) VALUES
-- Nord America (Stati Uniti)
('Columbia University', 'USA', 'New York', 'https://www.columbia.edu'),
('University of California, Berkeley', 'USA', 'Berkeley', 'https://www.berkeley.edu'),
('University of California, Los Angeles (UCLA)', 'USA', 'Los Angeles', 'https://www.ucla.edu'),
('Boston University', 'USA', 'Boston', 'https://www.bu.edu'),
('University of Washington', 'USA', 'Seattle', 'https://www.washington.edu'),
('New York University (NYU)', 'USA', 'New York', 'https://www.nyu.edu'),
-- Nord America (Canada)
('University of Toronto', 'Canada', 'Toronto', 'https://www.utoronto.ca'),
('McGill University', 'Canada', 'Montreal', 'https://www.mcgill.ca'),
('University of British Columbia', 'Canada', 'Vancouver', 'https://www.ubc.ca'),
-- Asia (Giappone)
('Waseda University', 'Japan', 'Tokyo', 'https://www.waseda.jp'),
('Keio University', 'Japan', 'Tokyo', 'https://www.keio.ac.jp'),
('Kyoto University', 'Japan', 'Kyoto', 'https://www.kyoto-u.ac.jp'),
('University of Tokyo', 'Japan', 'Tokyo', 'https://www.u-tokyo.ac.jp'),
-- Asia (Corea del Sud)
('Seoul National University', 'South Korea', 'Seoul', 'https://www.snu.ac.kr'),
('Yonsei University', 'South Korea', 'Seoul', 'https://www.yonsei.ac.kr'),
('Korea University', 'South Korea', 'Seoul', 'https://korea.edu'),
-- Asia (Cina)
('Peking University', 'China', 'Beijing', 'https://english.pku.edu.cn'),
('Tsinghua University', 'China', 'Beijing', 'https://www.tsinghua.edu.cn'),
('Fudan University', 'China', 'Shanghai', 'https://www.fudan.edu.cn'),
-- Asia (Singapore e Taiwan)
('National University of Singapore (NUS)', 'Singapore', 'Singapore', 'https://nus.edu.sg'),
('Nanyang Technological University', 'Singapore', 'Singapore', 'https://www.ntu.edu.sg'),
('National Taiwan University', 'Taiwan', 'Taipei', 'https://www.ntu.edu.tw'),
-- Oceania (Australia)
('University of Sydney', 'Australia', 'Sydney', 'https://www.sydney.edu.au'),
('University of Melbourne', 'Australia', 'Melbourne', 'https://www.unimelb.edu.au'),
('Monash University', 'Australia', 'Melbourne', 'https://www.monash.edu'),
('University of New South Wales (UNSW)', 'Australia', 'Sydney', 'https://www.unsw.edu.au'),
-- Sud America
('Universidade de São Paulo (USP)', 'Brazil', 'São Paulo', 'https://www5.usp.br'),
('Universidad de Buenos Aires (UBA)', 'Argentina', 'Buenos Aires', 'https://www.uba.ar');

INSERT INTO Applications (
    student_id, institution_id, lecturer_id, academic_year, mobility_period,
    actual_arrival_date, actual_departure_date, status, is_la_approved, la_decision_date, la_rejection_reason, are_exams_approved
) VALUES
-- DOMANDE PER LO "STUDENT TEST" (ID 1 -> Lecturer 2)
-- App 1: MOBILITY_IN_PROGRESS (Allineato al tuo doc "errore file")
(1, 1, 2, '2025/2026', 'FIRST_SEMESTER', '2025-09-01', NULL, 'MOBILITY_IN_PROGRESS', TRUE, '2025-06-15', NULL, FALSE),
-- App 2: CREATED (Nessun documento inserito ancora, solo creata)
(1, 2, 2, '2025/2026', 'FULL_YEAR', NULL, NULL, 'CREATED', FALSE, NULL, NULL, FALSE),
-- App 3: AWAITING_FOR_APPROVAL (In attesa che il Lecturer approvi il LA)
(1, 3, 2, '2025/2026', 'SECOND_SEMESTER', NULL, NULL, 'AWAITING_FOR_APPROVAL', FALSE, NULL, NULL, FALSE),
-- App 4: PRE_DEPARTURE_COMPLETED (LA approvato, pronto a partire)
(1, 4, 2, '2025/2026', 'FIRST_SEMESTER', NULL, NULL, 'PRE_DEPARTURE_COMPLETED', TRUE, '2025-07-20', NULL, FALSE),
-- App 5: WAITING_FOR_EXAM_SCORE_APPROVAL (Studente tornato, caricato ToR, aspetta ok ai voti)
(1, 5, 2, '2025/2026', 'FIRST_SEMESTER', '2025-08-28', '2026-01-20', 'WAITING_FOR_EXAM_SCORE_APPROVAL', TRUE, '2025-06-10', NULL, FALSE),
-- App 6: CLOSED (Tutto finito, esami e documenti approvati)
(1, 6, 2, '2024/2025', 'FULL_YEAR', '2024-09-05', '2025-06-30', 'CLOSED', TRUE, '2024-05-15', NULL, TRUE),
-- App 7: AWAITING_MODIFICATION_APPROVAL (In mobilità, ha proposto cambi al piano di studi)
(1, 7, 2, '2025/2026', 'FULL_YEAR', '2025-09-10', NULL, 'AWAITING_MODIFICATION_APPROVAL', TRUE, '2025-06-01', NULL, FALSE),
-- App 8: CANCELED (LA rifiutato oppure annullata)
(1, 8, 2, '2025/2026', 'SECOND_SEMESTER', NULL, NULL, 'CANCELED', FALSE, '2025-10-12', 'Mancanza di requisiti linguistici', FALSE),

-- DOMANDE PER ALTRI UTENTI (Per testare che i lecturer vedano solo la loro roba)
-- App 9 (Student 4, Lecturer 6): Creata ma non visibile a Lecturer Test
(4, 9, 6, '2025/2026', 'FIRST_SEMESTER', NULL, NULL, 'AWAITING_FOR_APPROVAL', FALSE, NULL, NULL, FALSE),
-- App 10 (Student 5, Lecturer 6): Mobilità in corso
(5, 10, 6, '2025/2026', 'FULL_YEAR', '2025-09-01', NULL, 'MOBILITY_IN_PROGRESS', TRUE, '2025-06-25', NULL, FALSE);

INSERT INTO ExamsMapping (
    application_id, foreign_course_code, foreign_course_name, foreign_course_credits,
    unive_course_code, unive_course_title, unive_course_credits, score_obtained, exam_date, is_proposed_change, is_approved_by_lecturer
) VALUES
-- App 1 (Mobilità in corso, normale)
(1, 'CS101', 'Intro to Computer Science', 5.0, 'CT010', 'Informatica Base', 6, NULL, NULL, FALSE, FALSE),
-- App 2 (Appena creata, nessun voto)
(2, 'ENG200', 'English Literature', 4.0, 'LT001', 'Letteratura Inglese', 6, NULL, NULL, FALSE, FALSE),
-- App 3 (In attesa di approvazione LA)
(3, 'MATH300', 'Linear Algebra', 6.0, 'MAT01', 'Algebra Lineare', 6, NULL, NULL, FALSE, FALSE),
-- App 4 (Pre-departure, LA ok)
(4, 'PHY101', 'Physics I', 5.0, 'FIS01', 'Fisica Generale', 6, NULL, NULL, FALSE, FALSE),
-- App 5 (Studente tornato, inseriti voti, aspetta il professore)
(5, 'BIO101', 'Biology', 4.0, 'BIO01', 'Biologia', 6, 'A', '2025-12-15', FALSE, FALSE),
(5, 'BIO102', 'Genetics', 4.0, 'BIO02', 'Genetica', 6, 'B+', '2026-01-10', FALSE, FALSE),
-- App 6 (Tutto concluso, prof ha già approvato i voti)
(6, 'ECO101', 'Microeconomics', 6.0, 'ECO01', 'Microeconomia', 9, '30/30', '2025-01-20', FALSE, TRUE),
-- App 7 (Awaiting modification: studente ha aggiunto un corso)
(7, 'ART101', 'Art History (OLD)', 4.0, 'ART01', 'Storia dell Arte', 6, NULL, NULL, FALSE, FALSE),
(7, 'ART201', 'Modern Art (NEW)', 4.0, 'ART02', 'Arte Moderna', 6, NULL, NULL, TRUE, FALSE),
-- App 8 (Cancellata/Rifiutata)
(8, 'HIS101', 'World History', 5.0, 'STO01', 'Storia Globale', 6, NULL, NULL, FALSE, FALSE);

INSERT INTO Documents (application_id, document_type, file_name, file_path, status, decision_date, rejection_reason) VALUES
-- App 1: Documento che genererà errore (il file non esiste fisicamente)
(1, 'LEARNING_AGREEMENT', 'LA_Bianchi_Filippo_Signed.pdf', '/uploads/docs/1/LA_Bianchi_Filippo_Signed.pdf', 'APPROVED', NULL, NULL),

-- App 3: Documento caricato ma in attesa di approvazione
(3, 'LEARNING_AGREEMENT', 'LA_Test_Awaiting.pdf', '/uploads/docs/3/test.pdf', 'PENDING', NULL, NULL),

-- App 4: Learning Agreement Approvato
(4, 'LEARNING_AGREEMENT', 'LA_Test_PreDep.pdf', '/uploads/docs/4/test.pdf', 'APPROVED', '2025-07-20', NULL),

-- App 5: LA Approvato + Transcript of Records caricato in attesa
(5, 'LEARNING_AGREEMENT', 'LA_Test_Waiting.pdf', '/uploads/docs/5/test_la.pdf', 'APPROVED', '2025-06-10', NULL),
(5, 'TRANSCRIPT_OF_RECORDS', 'ToR_Test_Waiting.pdf', '/uploads/docs/5/test_tor.pdf', 'PENDING', NULL, NULL),

-- App 6: Entrambi i documenti approvati (Stato Closed)
(6, 'LEARNING_AGREEMENT', 'LA_Test_Closed.pdf', '/uploads/docs/6/test_la.pdf', 'APPROVED', '2024-05-15', NULL),
(6, 'TRANSCRIPT_OF_RECORDS', 'ToR_Test_Closed.pdf', '/uploads/docs/6/test_tor.pdf', 'APPROVED', '2025-07-05', NULL),

-- App 7: Modifica in corso
(7, 'LEARNING_AGREEMENT', 'LA_Test_Modificato.pdf', '/uploads/docs/7/test_la_mod.pdf', 'PENDING', NULL, NULL),

-- App 8: Documento rifiutato (con data valida e motivazione)
(1, 'LEARNING_AGREEMENT', 'LA_Test_Errato.pdf', '/uploads/docs/8/LA_Test_Errato_Da_Modificare.pdf', 'REJECTED', '2026-12-15', 'TARDO!! SEI TARDO!, modifica il secondo campo!!');