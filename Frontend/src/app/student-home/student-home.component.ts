/* ==========================================================================
   STUDENT HOME COMPONENT - TYPESCRIPT LOGIC
   Gestisce la navigazione interna dell'Area Studenti, il recupero asincrono
   della mobilità attiva dal database e la gestione del menu utente.
   ========================================================================== */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  OnInit,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NewRequestComponent } from '../new-request/new-request.component';
import { MyRequestsComponent } from '../my-requests/my-requests.component';
import { ActiveMobilityComponent } from '../active-mobility/active-mobility.component';

// Servizi di utilità e internazionalizzazione
import { ThemeService } from '../services/theme.service';
import { TranslationService } from '../services/translation.service';
import { TranslatePipe } from '../translate.pipe';

@Component({
  selector: 'app-student-home',
  standalone: true,
  imports: [
    CommonModule,
    NewRequestComponent,
    MyRequestsComponent,
    ActiveMobilityComponent,
    TranslatePipe,
  ],
  templateUrl: './student-home.component.html',
  styleUrls: ['./student-home.component.css'],
})
export class StudentHomeComponent implements OnInit {
  @Input() utente: any;
  @Output() onLogout = new EventEmitter<void>();

  // Stati di controllo interni per viste e menu
  menuAperto: boolean = false;
  vistaAttiva: string = 'dashboard';
  idRichiestaDaModificare: number | null = null;
  praticaAttiva: any = null;

  constructor(
    private cdr: ChangeDetectorRef,
    public themeService: ThemeService,
    public translationService: TranslationService,
  ) {}

  ngOnInit() {
    // Al caricamento, interroga il server per verificare se lo studente possiede una mobilità attiva
    if (this.utente && this.utente.email) {
      const emailSicura = encodeURIComponent(this.utente.email);
      fetch(`http://localhost:3000/api/applications?email=${emailSicura}`)
        .then((res) => res.json())
        .then((data) => {
          // Elenco degli stati che abilitano il box speciale "In Erasmus" nella home
          const activeStatuses = [
            'AWAITING_FOR_APPROVAL',
            'AWAITING_MODIFICATION_APPROVAL',
            'PRE_DEPARTURE_COMPLETED',
            'MOBILITY_IN_PROGRESS',
            'WAITING_FOR_EXAM_SCORE_APPROVAL',
          ];
          this.praticaAttiva = data.find((req: any) => activeStatuses.includes(req.status));
          this.cdr.detectChanges();
        })
        .catch((err) => console.error('Errore recupero mobilità attiva:', err));
    }
  }

  /**
   * Calcola le iniziali del nome utente per l'avatar circolare nell'header.
   */
  get iniziali(): string {
    if (!this.utente) return '';
    return (this.utente.first_name.charAt(0) + this.utente.last_name.charAt(0)).toUpperCase();
  }

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.menuAperto = !this.menuAperto;
  }

  /* Chiude automaticamente il menu profilo cliccando in qualsiasi punto fuori dal dropdown */
  @HostListener('document:click')
  chiudiMenu() {
    this.menuAperto = false;
  }

  logout(event: Event) {
    event.preventDefault();
    this.onLogout.emit();
  }

  /* --- METODI DI ROUTING INTERNO --- */

  apriNuovaRichiesta(editId: number | null = null) {
    this.idRichiestaDaModificare = editId;
    this.vistaAttiva = 'nuovaRichiesta';
  }

  tornaAllaDashboard() {
    this.vistaAttiva = 'dashboard';
  }

  apriLeMieRichieste() {
    this.vistaAttiva = 'leMieRichieste';
  }

  apriGestioneErasmus() {
    this.vistaAttiva = 'gestioneErasmus';
  }

  eseguiLogoutDalFiglio() {
    this.onLogout.emit();
  }

  gestisciRitornoDaRichiesta() {
    if (this.idRichiestaDaModificare) {
      this.vistaAttiva = 'leMieRichieste';
      this.idRichiestaDaModificare = null;
    } else {
      this.vistaAttiva = 'dashboard';
    }
  }

  vaiAlleMieRichiesteDopoSuccesso() {
    this.vistaAttiva = 'leMieRichieste';
    this.idRichiestaDaModificare = null;
  }
}
