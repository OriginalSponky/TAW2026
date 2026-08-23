import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentHomeComponent } from './student-home/student-home.component';
import { LecturerDashboardComponent } from './lecturer-dashboard/lecturer-dashboard.component';
import { StaffDashboardComponent } from './staff-dashboard/staff-dashboard.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StudentHomeComponent,
    LecturerDashboardComponent,
    StaffDashboardComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  emailInput: string = '';
  passwordInput: string = '';

  utenteLoggato: any = null;
  messaggioErrore: string = '';

  inRegistrazione: boolean = false;
  registrazioneDaGoogle: boolean = false;
  datiRegistrazione: any = null;
  passwordConferma: string = '';

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    const utenteSalvato = localStorage.getItem('utenteLoggato');
    if (utenteSalvato) {
      this.utenteLoggato = JSON.parse(utenteSalvato);
    } else {
      this.inizializzaBottoneGoogle();
    }
  }

  // Classic Login
  eseguiLogin() {
    fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: this.emailInput, password: this.passwordInput }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorMsg = await response.text();
          throw new Error(errorMsg);
        }
        return response.json();
      })
      .then((data) => {
        this.messaggioErrore = '';

        if (data.action === 'LOGIN') {
          // Login standard
          this.utenteLoggato = data.user;
          localStorage.setItem('utenteLoggato', JSON.stringify(data.user));
        } else if (data.action === 'REQUIRES_REGISTRATION') {
          //Registration check
          this.inRegistrazione = true;
          this.registrazioneDaGoogle = false;
          this.datiRegistrazione = data.prefill;
          this.passwordConferma = '';
        }
        this.cdr.detectChanges();
      })
      .catch((error) => {
        this.messaggioErrore = error.message;
        this.utenteLoggato = null;
        this.inRegistrazione = false;
        this.cdr.detectChanges();
      });
  }

  // Registration of new users
  confermaRegistrazione() {
    if (!this.datiRegistrazione.first_name || !this.datiRegistrazione.last_name) {
      this.messaggioErrore = 'Per favore, compila Nome e Cognome.';
      return;
    }

    let passwordDaSalvare = '';

    if (this.registrazioneDaGoogle) {
      // Randomly generated pw for google user
      passwordDaSalvare =
        Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    } else {
      if (this.passwordConferma !== this.passwordInput) {
        this.messaggioErrore = 'Le password non coincidono!';
        return;
      }
      passwordDaSalvare = this.passwordConferma;
    }

    fetch('http://localhost:3000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: this.datiRegistrazione.email,
        password: passwordDaSalvare,
        first_name: this.datiRegistrazione.first_name,
        last_name: this.datiRegistrazione.last_name,
        role: this.datiRegistrazione.role,
        matriculation_number: this.datiRegistrazione.matriculation_number,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Errore durante la registrazione.');
        return res.json();
      })
      .then(() => {
        this.inRegistrazione = false;

        if (this.registrazioneDaGoogle) {
          // Instant Login with Google
          this.utenteLoggato = {
            first_name: this.datiRegistrazione.first_name,
            last_name: this.datiRegistrazione.last_name,
            email: this.datiRegistrazione.email,
            role: this.datiRegistrazione.role,
            matriculation_number: this.datiRegistrazione.matriculation_number,
          };
          localStorage.setItem('utenteLoggato', JSON.stringify(this.utenteLoggato));
          this.cdr.detectChanges();
        } else {
          // Manual Login
          this.eseguiLogin();
        }
      })
      .catch((err) => {
        this.messaggioErrore = err.message;
        this.cdr.detectChanges();
      });
  }

  annullaRegistrazione() {
    this.inRegistrazione = false;
    this.registrazioneDaGoogle = false;
    this.messaggioErrore = '';
    this.cdr.detectChanges();
  }

  // Google Auth Login
  gestisciRispostaGoogle(response: any) {
    const token = response.credential;
    const payloadBase64 = token.split('.')[1];
    const decodedPayload = JSON.parse(atob(payloadBase64));

    const googleEmail = decodedPayload.email;

    fetch('http://localhost:3000/api/google-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Send info
      body: JSON.stringify({
        email: googleEmail,
        given_name: decodedPayload.given_name,
        family_name: decodedPayload.family_name,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorMsg = await res.text();
          throw new Error(errorMsg);
        }
        return res.json();
      })
      .then((data) => {
        this.messaggioErrore = '';

        if (data.action === 'REQUIRES_REGISTRATION') {
          // Registration Screen
          this.inRegistrazione = true;
          this.registrazioneDaGoogle = true;
          this.datiRegistrazione = data.prefill;
          this.passwordInput = '';
          this.passwordConferma = '';
        } else if (data.action === 'LOGIN') {
          // Regular Login
          this.utenteLoggato = data.user;
          localStorage.setItem('utenteLoggato', JSON.stringify(data.user));
        }

        this.cdr.detectChanges();
      })
      .catch((error) => {
        this.messaggioErrore = error.message;
        this.utenteLoggato = null;
        if ((window as any).google) {
          (window as any).google.accounts.id.disableAutoSelect();
        }
        this.cdr.detectChanges();
      });
  }

  inizializzaBottoneGoogle() {
    setTimeout(() => {
      if ((window as any).google) {
        (window as any).google.accounts.id.initialize({
          client_id: '815258409239-ud52hl573eknubjouh7j6v0id12bh55j.apps.googleusercontent.com',
          callback: this.gestisciRispostaGoogle.bind(this),
        });

        (window as any).google.accounts.id.renderButton(
          document.getElementById('google-btn-container'),
          {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            shape: 'rectangular',
            text: 'signin_with',
            logo_alignment: 'left',
          },
        );
      }
    }, 100);
  }

  eseguiLogout() {
    this.utenteLoggato = null;
    this.emailInput = '';
    this.passwordInput = '';
    this.messaggioErrore = '';
    localStorage.removeItem('utenteLoggato');

    if ((window as any).google) {
      (window as any).google.accounts.id.disableAutoSelect();
    }

    this.cdr.detectChanges();

    this.inizializzaBottoneGoogle();
  }
}
