import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RequestDetailComponent } from '../request-detail/request-detail.component';

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
  constructor(private cdr: ChangeDetectorRef) {}

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

  inviaModifica() {
    alert('Modifica inviata con successo! Il docente referente la valuterà a breve.');
    this.pannelloAttivo = null;
  }

  // --- Translation Functions ---

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
      case 'WAITING_FOR_EXAM_SCORE_APPROVAL':
        return 'Waiting for exam score approval';
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

  eliminaRichiesta(id: number) {
    if (confirm('Sei sicuro di voler eliminare questa richiesta? Questa azione è irreversibile.')) {
      fetch(`http://localhost:3000/api/applications/${id}`, { method: 'DELETE' })
        .then(() => {
          this.richieste = this.richieste.filter((r) => r.id !== id);
          this.cdr.detectChanges(); // Wake up Angular
        })
        .catch((err) => alert("Errore durante l'eliminazione."));
    }
  }
}


