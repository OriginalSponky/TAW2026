<img width="2557" height="1437" alt="Home Page Student" src="https://github.com/user-attachments/assets/f81e31e7-b0c7-4a9a-8ea4-ef58f5f182b3" />
# Overseas_Studio - Gestionale Mobilità Internazionale
**Progetto di Tecnologie e Applicazioni Web - A.A. 2025/2026**

**Sviluppato da:**

[![Cioffosplat](https://img.shields.io/badge/GitHub-Cioffosplat-181717?style=for-the-badge&logo=github)](https://github.com/Cioffosplat)
[![OriginalSponky](https://img.shields.io/badge/GitHub-OriginalSponky-181717?style=for-the-badge&logo=github)](https://github.com/OriginalSponky)

**Codice Utilizzato:**

![TypeScript](https://img.shields.io/badge/TypeScript-60%25-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-20%25-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-10%25-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-8%25-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![MySQL](https://img.shields.io/badge/SQL-2%25-4479A1?style=for-the-badge&logo=mysql&logoColor=white)

Questo progetto implementa una piattaforma web SPA (Single Page Application) per la gestione delle pratiche Erasmus/Overseas per l'Università Ca' Foscari.
Il sistema gestisce l'intero ciclo di vita della mobilità attraverso tre ruoli principali: **Studente**, **Docente Referente (Lecturer)** e **Ufficio Overseas (Staff)**.

## 📋 Requisiti di Sistema
- **Docker** e **Docker Compose** installati sul sistema.
- Porte libere necessarie:
    - `3000` (Backend Express)
    - `4200` (Frontend Angular)
    - `3306` (Database MySQL)
---

## 🚀 Avvio Rapido tramite Docker
L'applicazione è interamente containerizzata. Database, Backend e Frontend girano in tre container separati (`dbTAW`, `BackendTAW`, `FrontendTAW`) gestiti tramite `docker-compose`.

1. Aprire il terminale nella cartella root del progetto (dove si trova il file `docker-compose.yml`).
2. Eseguire il comando per costruire e avviare i container:
   ```bash
   docker-compose up --build
   ```
3. Attendere che il database MySQL completi l'inizializzazione. Al primo avvio, lo script `backend/mysql-init/init.sql` popolerà automaticamente le tabelle e gli utenti di test.
4. Accedere all'applicazione tramite browser all'indirizzo:
   👉 http://localhost:4200

## 🔑 Credenziali di Accesso (Dati di Test)
Il database viene popolato automaticamente con i seguenti profili di test, con i quali è possibile esplorare l'intero flusso della State Machine:

- 🧑‍🎓 **Ruolo: Studente**
    - Email: `000067@stud.unive.it`
    - Password: `student_test`
    - *Nota*: Qualsiasi login Google effettuato con un'email terminante in `@stud.unive.it` genererà automaticamente la schermata di registrazione come Studente.

- 👨‍🏫 **Ruolo: Docente Referente (Lecturer)**
    - Email: `lecturer.test@unive.it`
    - Password: `lecturer_test`

- 🏢 **Ruolo: Ufficio Mobilità (Staff)**
    - Email: `overseasout@unive.it`
    - Password: `staff_test`

## 🛠 Note Architetturali e di Sviluppo
- **Librerie Esterne**: Le cartelle `node_modules` verranno rigenerate automaticamente all'avvio del container Docker o tramite `npm install`.
- **Persistenza Dati**: I file PDF caricati (Learning Agreement e Transcript of Records) vengono salvati nel volume Docker `./backend/uploads`. I dati del database persistono in `./backend/mysql-data`.
- **Autenticazione Ibrida**: L'accesso al sistema supporta sia le credenziali classiche (le password dei nuovi utenti sono salvate con hash bcrypt) sia il Single Sign-On (SSO) tramite Google.
