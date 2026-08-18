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
                              foreign_course_credits DECIMAL(4,1) NOT NULL,

    -- DATI DEL CORSO A CA' FOSCARI
                              unive_course_code VARCHAR(50) NOT NULL,
                              unive_course_title VARCHAR(255) NOT NULL,
                              unive_course_credits INT NOT NULL,

                              score_obtained VARCHAR(10) NULL,
                              exam_date DATE NULL,

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
-- INSERIMENTO DATI DI ESEMPIO (SEEDING)
-- ---------------------------------------------------------

-- 1. Popoliamo gli Utenti (1 Studente, 1 Professore, 1 Staff)
INSERT INTO Users (role, first_name, last_name, matriculation_number, email, password_hash) VALUES
                                                                                                ('STUDENT', 'Filippo', 'Schierato', '907476', '907476@stud.unive.it', 'Papaya2026@'),
                                                                                                ('LECTURER', 'Mario', 'Rossi', NULL, 'mario.rossi@unive.it', 'hash_password_fittizio_2'),
                                                                                                ('STAFF', 'Overseas', 'Office', NULL, 'overseaout@unive.it', 'hash_password_fittizio_3');

-- 2. Popoliamo le Istituzioni Estere (Atenei Partner)
INSERT INTO Institutions (name, country, city, website_url) VALUES
                                                                ('Universidad de Barcelona', 'Spagna', 'Barcellona', 'https://www.ub.edu'),
                                                                ('Technical University of Munich', 'Germania', 'Monaco', 'https://www.tum.de');

-- 3. Creiamo una Domanda di Mobilità (Filippo va a Barcellona nel Primo Semestre)
-- L'ID dello studente è 1, Istituzione 1, Professore 2
INSERT INTO Applications (student_id, institution_id, lecturer_id, academic_year, mobility_period, status, is_la_approved) VALUES
    (1, 1, 2, '2025/2026', 'FIRST_SEMESTER', 'MOBILITY_IN_PROGRESS', TRUE);

-- 4. Creiamo la Mappatura degli Esami (Learning Agreement)
-- Inseriamo esami pertinenti al tuo percorso di studi
INSERT INTO ExamsMapping (application_id, foreign_course_code, foreign_course_name, foreign_course_credits, unive_course_code, unive_course_title, unive_course_credits, score_obtained, is_approved_by_lecturer) VALUES
                                                                                                                                                                                                                      (1, 'UB-INF101', 'Desarrollo Web Avanzado', 6.0, 'CM0123', 'Tecnologie e Applicazioni Web', 6, '28', TRUE),
                                                                                                                                                                                                                      (1, 'UB-INF102', 'Introducción a la Programación', 6.0, 'CM0456', 'Introduzione alla Programmazione', 6, NULL, FALSE),(1, 'UB-DSG200', 'Diseño de Interfaz de Usuario', 6.0, 'CM0789', 'UX Design', 6, '30', TRUE);

-- 5. Inseriamo un Documento caricato dallo studente
INSERT INTO Documents (application_id, document_type, file_name, file_path, status) VALUES
    (1, 'LEARNING_AGREEMENT', 'LA_Bianchi_Filippo_Signed.pdf', '/uploads/docs/1/LA_Bianchi_Filippo_Signed.pdf', 'APPROVED');