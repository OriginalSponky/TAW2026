import { Component, OnInit, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-active-mobility',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './active-mobility.component.html',
  styleUrls: ['./active-mobility.component.css'],
})
export class ActiveMobilityComponent implements OnInit {
  // --- HEADER & UTENTE ---
  @Input() utente: any;
  @Input() pratica: any;
  @Output() onBack = new EventEmitter<void>();
  @Output() onLogout = new EventEmitter<void>();
  menuAperto: boolean = false;

  get iniziali(): string {
    if (!this.utente) return 'ST'; // ST di default per 'Student Test'
    return (this.utente.first_name.charAt(0) + this.utente.last_name.charAt(0)).toUpperCase();
  }

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.menuAperto = !this.menuAperto;
  }

  effettuaLogout(event: Event) {
    event.preventDefault();
    this.onLogout.emit();
  }

  activeView: 'activeMobility' | 'modifications' = 'activeMobility';
  activePanel: string | null = null;

  richiestaAttiva = {
    id: 1,
    institution_name: 'Universidad de Barcelona',
    country: 'Spagna',
    academic_year: '2025/2026',
    mobility_period: 'FIRST_SEMESTER',
    status: 'PRE_DEPARTURE_COMPLETED', // Cambia questo in 'MOBILITY_IN_PROGRESS' per testare l'altra fase
    arrival_date: '',
    departure_date: '',
  };

  nuoviEsamiLA: any[] = [];
  esamiToR: any[] = [];

  mostraModale: boolean = false;
  modalConfig: any = { icon: '', title: '', text: '', action: '', btnClass: '', btnText: '' };

  motivoRinuncia: string = '';
  motivoVariazioneLA: string = '';
  isSubmitting: boolean = false;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    if (this.pratica) {
      this.richiestaAttiva = this.pratica;
    }
  }

  cambiaVista(vista: 'activeMobility' | 'modifications') {
    this.activeView = vista;
  }

  togglePanel(panel: string) {
    this.activePanel = this.activePanel === panel ? null : panel;

    if (panel === 'la' && this.nuoviEsamiLA.length === 0) this.aggiungiEsameLA();
    if (panel === 'tor' && this.esamiToR.length === 0) this.aggiungiEsameToR();
  }

  // --- LOGICA RIGHE DINAMICHE ESAMI ---

  aggiungiEsameLA() {
    this.nuoviEsamiLA.push({
      foreignCode: '',
      foreignName: '',
      foreignCredits: null,
      localCode: '',
      localName: '',
      localCredits: null,
    });
  }

  rimuoviEsameLA(indice: number) {
    this.nuoviEsamiLA.splice(indice, 1);
  }

  aggiungiEsameToR() {
    this.esamiToR.push({
      foreignCode: '',
      foreignName: '',
      foreignCredits: null,
      localCode: '',
      localName: '',
      localCredits: null,
      score: '',
      date: '',
    });
  }

  rimuoviEsameToR(indice: number) {
    this.esamiToR.splice(indice, 1);
  }

  // --- GESTIONE MODALI UNIVERSALE ---

  apriModaleConferma(azione: string) {
    this.modalConfig.action = azione;
    this.motivoRinuncia = '';

    switch (azione) {
      case 'start_mobility':
        if (!this.richiestaAttiva.arrival_date || !this.richiestaAttiva.departure_date) {
          alert('Inserisci entrambe le date per proseguire.');
          return;
        }
        this.modalConfig = {
          action: azione,
          icon: '🌍',
          title: 'Avvia Mobilità',
          text: "Confermi le date inserite per l'inizio del tuo Erasmus?",
          btnClass: 'btn-primary',
          btnText: 'Conferma e Parti',
        };
        break;
      case 'reject_mobility':
        this.modalConfig = {
          action: azione,
          icon: '⚠️',
          title: 'Rinuncia Mobilità',
          text: 'Sei sicuro di voler rinunciare? La pratica verrà annullata.',
          btnClass: 'btn-danger-outline',
          btnText: 'Conferma Rinuncia',
        };
        break;
      case 'submit_la':
        this.modalConfig = {
          action: azione,
          icon: '📝',
          title: 'Invia Modifica L.A.',
          text: 'La modifica sarà inviata al docente. Potrai vederne lo stato nella sezione "Stato Modifiche".',
          btnClass: 'btn-primary',
          btnText: 'Invia Proposta',
        };
        break;
      case 'submit_tor':
        this.modalConfig = {
          action: azione,
          icon: '🎓',
          title: 'Invia Voti e ToR',
          text: 'Confermi l\'invio dei voti? Verificherai l\'esito nella sezione "Stato Modifiche".',
          btnClass: 'btn-success',
          btnText: 'Conferma e Invia',
        };
        break;
    }

    this.mostraModale = true;
  }

  chiudiModale() {
    this.mostraModale = false;
  }

  eseguiAzione() {
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    // Qui in futuro metterai le fetch(PUT/POST) per aggiornare il DB
    setTimeout(() => {
      if (this.modalConfig.action === 'start_mobility') {
        this.richiestaAttiva.status = 'MOBILITY_IN_PROGRESS';
      } else if (this.modalConfig.action === 'reject_mobility') {
        this.richiestaAttiva.status = 'CANCELED';
      }

      this.activePanel = null;
      this.mostraModale = false;
      this.isSubmitting = false;
      this.cdr.detectChanges();

      alert('Operazione completata con successo!');
    }, 800);
  }
  tornaIndietro(event: Event) {
    event.preventDefault();
    this.onBack.emit();
  }
}
