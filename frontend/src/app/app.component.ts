/* ==========================================================================
   APP COMPONENT - TYPESCRIPT LOGIC
   Gestisce lo stato di autenticazione globale, le chiamate API di login/registrazione,
   l'integrazione con Google SSO (OAuth2) e il reindirizzamento dei ruoli.
   ========================================================================== */

import { Component, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentHomeComponent } from './student-home/student-home.component';
import { LecturerDashboardComponent } from './lecturer-dashboard/lecturer-dashboard.component';
import { StaffDashboardComponent } from './staff-dashboard/staff-dashboard.component';
import { Subscription } from 'rxjs';

// Servizi globali di internazionalizzazione e temi
import { TranslatePipe } from './translate.pipe';
import { TranslationService } from './services/translation.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StudentHomeComponent,
    LecturerDashboardComponent,
    StaffDashboardComponent,
    TranslatePipe,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit, OnDestroy {
  // Campi di input per il form di autenticazione
  emailInput: string = '';
  passwordInput: string = '';

  utenteLoggato: any = null;
  messaggioErrore: string = '';

  // Stati di controllo per la registrazione di nuovi utenti
  inRegistrazione: boolean = false;
  registrazioneDaGoogle: boolean = false;
  datiRegistrazione: any = null;
  passwordConferma: string = '';

  private langSub!: Subscription;

  constructor(
    private cdr: ChangeDetectorRef,
    public translationService: TranslationService,
    public themeService: ThemeService,
  ) {}

  ngOnInit() {
    // Controllo persistenza sessione al caricamento della pagina
    const utenteSalvato = localStorage.getItem('utenteLoggato');
    if (utenteSalvato) {
      this.utenteLoggato = JSON.parse(utenteSalvato);
    } else {
      // Inizializza il bottone Google e si mette in ascolto dei cambi lingua
      this.langSub = this.translationService.currentLang$.subscribe(() => {
        if (!this.utenteLoggato && !this.inRegistrazione) {
          this.inizializzaBottoneGoogle();
        }
      });
    }
  }

  ngOnDestroy() {
    if (this.langSub) this.langSub.unsubscribe();
  }

  /**
   * Esegue il login standard inviando credenziali al backend.
   * Se l'utente non esiste ma l'email è istituzionale, apre il modulo di registrazione.
   */
  eseguiLogin() {
    fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: this.emailInput, password: this.passwordInput }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorMsg = await response.text();
          if (errorMsg.includes('Password errata')) throw new Error('ERRORS.WRONG_PASSWORD');
          if (errorMsg.includes('Email non trovata')) throw new Error('ERRORS.EMAIL_NOT_FOUND');
          throw new Error(errorMsg);
        }
        return response.json();
      })
      .then((data) => {
        this.messaggioErrore = '';

        if (data.action === 'LOGIN') {
          this.utenteLoggato = data.user;
          localStorage.setItem('utenteLoggato', JSON.stringify(data.user));
        } else if (data.action === 'REQUIRES_REGISTRATION') {
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

  /**
   * Finalizza la registrazione di un nuovo utente salvandolo nel database.
   */
  confermaRegistrazione() {
    if (!this.datiRegistrazione.first_name || !this.datiRegistrazione.last_name) {
      this.messaggioErrore = 'ERRORS.MISSING_NAMES';
      return;
    }

    let passwordDaSalvare = '';

    if (this.registrazioneDaGoogle) {
      // Genera una password casuale sicura per gli utenti autenticati via Google SSO
      passwordDaSalvare =
        Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    } else {
      if (this.passwordConferma !== this.passwordInput) {
        this.messaggioErrore = 'ERRORS.PASSWORD_MISMATCH';
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
        if (!res.ok) throw new Error('ERRORS.REGISTRATION_ERROR');
        return res.json();
      })
      .then(() => {
        this.inRegistrazione = false;

        if (this.registrazioneDaGoogle) {
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

  /**
   * Gestisce il token restituito dal login Google e verifica i permessi di ateneo.
   */
  gestisciRispostaGoogle(response: any) {
    const token = response.credential;
    const payloadBase64 = token.split('.')[1];
    const decodedPayload = JSON.parse(atob(payloadBase64));

    fetch('http://localhost:3000/api/google-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: decodedPayload.email,
        given_name: decodedPayload.given_name,
        family_name: decodedPayload.family_name,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('ERRORS.NOT_AUTHORIZED');
        return res.json();
      })
      .then((data) => {
        this.messaggioErrore = '';

        if (data.action === 'REQUIRES_REGISTRATION') {
          this.inRegistrazione = true;
          this.registrazioneDaGoogle = true;
          this.datiRegistrazione = data.prefill;
          this.passwordInput = '';
          this.passwordConferma = '';
        } else if (data.action === 'LOGIN') {
          this.utenteLoggato = data.user;
          localStorage.setItem('utenteLoggato', JSON.stringify(data.user));
        }

        this.cdr.detectChanges();
      })
      .catch((error) => {
        this.messaggioErrore = error.message;
        this.utenteLoggato = null;
        if ((window as any).google) (window as any).google.accounts.id.disableAutoSelect();
        this.cdr.detectChanges();
      });
  }

  /**
   * Inizializza e renderizza il bottone ufficiale Google Identity Services.
   */
  inizializzaBottoneGoogle() {
    setTimeout(() => {
      if ((window as any).google) {
        const container = document.getElementById('google-btn-container');
        if (container) container.innerHTML = '';

        const currentLanguage = this.translationService.getLanguage() === 'it' ? 'it-IT' : 'en-US';

        (window as any).google.accounts.id.initialize({
          client_id: '815258409239-ud52hl573eknubjouh7j6v0id12bh55j.apps.googleusercontent.com',
          callback: this.gestisciRispostaGoogle.bind(this),
          locale: currentLanguage,
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

  /**
   * Esegue il logout dell'utente pulendo la sessione locale.
   */
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
