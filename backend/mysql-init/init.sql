USE app_database;

CREATE TABLE IF NOT EXISTS projects (
                                        id INT AUTO_INCREMENT PRIMARY KEY,
                                        title VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('planned', 'in_progress', 'completed') DEFAULT 'planned',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

INSERT INTO projects (title, description, status) VALUES
                                                      ('Oltre il Ponte', 'Design e sviluppo applicazione mobile con storyboard', 'in_progress'),
                                                      ('Sito Web Personale', 'Portfolio online per i progetti di programmazione', 'planned'),
                                                      ('API Express', 'Sviluppo backend e routing per connessione al database', 'in_progress');