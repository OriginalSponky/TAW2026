import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  coloreTesto: string = 'green';
  utenti: any[] = [];

  emailInput: string = '';
  passwordInput: string = '';
  utenteLoggato: any = null;

  messaggioErrore: string = '';

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    const utenteSalvato = localStorage.getItem('utenteLoggato');
    if (utenteSalvato) {
      this.utenteLoggato = JSON.parse(utenteSalvato);
    }
  }

  /*
  testServer() {
    fetch('http://localhost:3000/api/users')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Errore nella risposta del server');
        }
        return response.json();
      })
      .then((data) => {
        this.coloreTesto = 'green';
        this.messaggioErrore = '';
        this.utenti = data;
        this.cdr.detectChanges();
      })
      .catch((error) => {
        this.coloreTesto = 'red';
        this.messaggioErrore = 'Errore di connessione al server o DB spento.';
        this.utenti = [];
        console.error(error);
      });
  } */

  eseguiLogin() {
    fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: this.emailInput, password: this.passwordInput }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Credenziali errate');
        }
        return response.json();
      })
      .then((data) => {
        this.messaggioErrore = '';
        this.utenteLoggato = data;
        localStorage.setItem('utenteLoggato', JSON.stringify(data));
        this.cdr.detectChanges();
      })
      .catch((error) => {
        this.messaggioErrore = 'Email o password non valide.';
        this.utenteLoggato = null;
        this.cdr.detectChanges();
      });
  }

  eseguiLogout() {
    this.utenteLoggato = null;
    this.emailInput = '';
    this.passwordInput = '';
    localStorage.removeItem('utenteLoggato');
    this.cdr.detectChanges();
  }
}
