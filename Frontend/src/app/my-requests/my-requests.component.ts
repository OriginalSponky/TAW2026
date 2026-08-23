import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RequestDetailComponent } from '../request-detail/request-detail.component';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-my-requests',
  standalone: true,
  imports: [CommonModule, RequestDetailComponent],
  templateUrl: './my-requests.component.html',
  styleUrls: ['./my-requests.component.css'],
})
export class MyRequestsComponent implements OnInit {
  @Input() utente: any;
  @Output() onBack = new EventEmitter<void>();
  @Output() onNewRequest = new EventEmitter<void>();
  @Output() onLogout = new EventEmitter<void>();
  @Output() onEditRequest = new EventEmitter<number>();

  pannelloAttivo: number | null = null;
  richieste: any[] = [];
  richiestaSelezionata: number | null = null;
  menuAperto: boolean = false;


  // --- VARIABILI PER IL TOAST GLOBALE ---
  mostraAlert: boolean = false;
  alertType: 'success' | 'error' = 'success';
  alertMessage: string = '';

  // --- ELIMINAZIONE INLINE ---
  confermaEliminazioneId: number | null = null;
  isDeleting: boolean = false;

  constructor(
    private cdr: ChangeDetectorRef,
    public themeService: ThemeService,
  ) {}

  get iniziali(): string {
    if (!this.utente) return '';
    return (this.utente.first_name.charAt(0) + this.utente.last_name.charAt(0)).toUpperCase();
  }

  ngOnInit() {
    const emailSicura = encodeURIComponent(this.utente.email);
    fetch(`http://localhost:3000/api/applications?email=${emailSicura}`)
      .then((res) => {
        if (!res.ok) throw new Error('Errore dal server');
        return res.json();
      })
      .then((data) => {
        this.richieste = data;
        this.cdr.detectChanges();
      })
      .catch((err) => console.error('❌ Errore di lettura:', err));
  }

  // --- FUNZIONE PER GESTIRE IL TOAST ---
  mostraFeedback(tipo: 'success' | 'error', messaggio: string) {
    this.alertType = tipo;
    this.alertMessage = messaggio;
    this.mostraAlert = true;
    setTimeout(() => {
      this.chiudiFeedback();
    }, 4000);
  }

  chiudiFeedback() {
    this.mostraAlert = false;
  }

  tornaIndietro(event: Event) {
    event.preventDefault();
    this.onBack.emit();
  }

  vaiANuovaRichiesta(event: Event) {
    event.preventDefault();
    this.onNewRequest.emit();
  }

  togglePannello(id: number) {
    if (this.pannelloAttivo === id) {
      this.pannelloAttivo = null;
    } else {
      this.pannelloAttivo = id;
    }
  }

  formattaPeriodo(periodo: string): string {
    if (periodo === 'FIRST_SEMESTER') return 'First Semester';
    if (periodo === 'SECOND_SEMESTER') return 'Second Semester';
    if (periodo === 'FULL_YEAR') return 'Entire Year';
    return periodo;
  }

  getClasseStato(stato: string): string {
    switch (stato) {
      case 'CREATED':
        return 'status-created';
      case 'AWAITING_FOR_APPROVAL':
        return 'status-awaiting-la';
      case 'PRE_DEPARTURE_COMPLETED':
        return 'status-pre-departure';
      case 'MOBILITY_IN_PROGRESS':
        return 'status-in-progress';
      case 'AWAITING_MODIFICATION_APPROVAL':
        return 'status-awaiting-modification';
      case 'WAITING_FOR_EXAM_SCORE_APPROVAL':
        return 'status-waiting-score';
      case 'CLOSED':
        return 'status-closed';
      case 'CANCELED':
        return 'status-canceled';
      default:
        return 'status-closed';
    }
  }

  getTestoStato(stato: string): string {
    switch (stato) {
      case 'CREATED':
        return 'Created (Bozza)';
      case 'AWAITING_FOR_APPROVAL':
        return 'Awaiting L.A. approval';
      case 'PRE_DEPARTURE_COMPLETED':
        return 'Pre-departure completed';
      case 'MOBILITY_IN_PROGRESS':
        return 'Mobility in progress';
      case 'AWAITING_MODIFICATION_APPROVAL':
        return 'Awaiting modification approval';
      case 'WAITING_FOR_EXAM_SCORE_APPROVAL':
        return 'Awaiting exam score approval';
      case 'CLOSED':
        return 'Closed';
      case 'CANCELED':
        return 'Canceled';
      default:
        return 'Stato Sconosciuto';
    }
  }

  apriDettaglio(id: number) {
    this.richiestaSelezionata = id;
  }
  chiudiDettaglio() {
    this.richiestaSelezionata = null;
  }
  toggleMenu(event: Event) {
    event.stopPropagation();
    this.menuAperto = !this.menuAperto;
  }
  effettuaLogout(event: Event) {
    event.preventDefault();
    this.onLogout.emit();
  }
  modificaRichiesta(id: number) {
    this.onEditRequest.emit(id);
  }

  // --- LOGICA ELIMINAZIONE INLINE ---
  chiediConfermaEliminazione(id: number) {
    this.confermaEliminazioneId = id;
  }

  annullaEliminazione() {
    // Chiudiamo la zona di conferma
    this.confermaEliminazioneId = null;
  }

  confermaEliminazioneDefinitiva(id: number) {
    if (this.isDeleting) return;
    this.isDeleting = true;

    fetch(`http://localhost:3000/api/applications/${id}`, { method: 'DELETE' })
      .then((res) => {
        if (!res.ok) throw new Error("Errore durante l'eliminazione");
        return res.json();
      })
      .then(() => {
        this.richieste = this.richieste.filter((r) => r.id !== id);
        this.mostraFeedback('success', 'Richiesta eliminata correttamente.');
        this.confermaEliminazioneId = null;
        this.cdr.detectChanges();
      })
      .catch((err) => {
        this.mostraFeedback('error', "Errore durante l'eliminazione della richiesta.");
        this.confermaEliminazioneId = null;
      })
      .finally(() => {
        this.isDeleting = false;
      });
  }
  inviaModifica() {
    this.mostraFeedback('success', 'Richiesta di modifica inoltrata correttamente.');
    this.pannelloAttivo = null;
  }
}
