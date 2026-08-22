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
  // --- HEADER & USER ---
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

  richiestaAttiva: any = null;

  // --- CONTROLLO DINAMICO NOTIFICHE ---
  get hasNotifiche(): boolean {
    if (!this.richiestaAttiva) return false;
    return (
      !!this.richiestaAttiva.la_rejection_reason ||
      this.richiestaAttiva.status === 'AWAITING_MODIFICATION_APPROVAL' ||
      this.richiestaAttiva.status === 'WAITING_FOR_EXAM_SCORE_APPROVAL' ||
      this.richiestaAttiva.status === 'AWAITING_FOR_APPROVAL'
    );
  }

  formattaStato(status: string): string {
    if (!status) return '';
    return status.replace(/_/g, ' ');
  }

  nuoviEsamiLA: any[] = [];
  esamiToR: any[] = [];

  mostraModale: boolean = false;
  modalConfig: any = { icon: '', title: '', text: '', action: '', btnClass: '', btnText: '' };

  motivoRinuncia: string = '';
  motivoVariazioneLA: string = '';
  isSubmitting: boolean = false;

  // --- File Variables ---
  fileLA: File | null = null;
  fileToR: File | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    if (this.pratica && this.pratica.id) {
      this.caricaDatiReali(this.pratica.id);
    }
  }

  caricaDatiReali(appId: number) {
    fetch(`http://localhost:3000/api/applications/${appId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Errore di rete');
        return res.json();
      })
      .then((data) => {
        this.richiestaAttiva = data;
        this.cdr.detectChanges();
      })
      .catch((err) => console.error('Errore fetch database:', err));
  }

  cambiaVista(vista: 'activeMobility' | 'modifications') {
    this.activeView = vista;
  }

  togglePanel(panel: string) {
    this.activePanel = this.activePanel === panel ? null : panel;

    if (panel === 'la' && this.nuoviEsamiLA.length === 0) this.aggiungiEsameLA();
    if (panel === 'tor' && this.esamiToR.length === 0) this.aggiungiEsameToR();
  }

  // --- DYNAMIC EXAM LINES ---

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

  // --- MODALS ---

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
      case 'resubmit_modification':
        this.modalConfig = {
          action: azione,
          icon: '🔄',
          title: 'Invia Nuova Revisione',
          text: "I dati corretti verranno inviati all'ufficio per una nuova approvazione.",
          btnClass: 'btn-primary',
          btnText: 'Invia Revisione',
        };
        break;
    }

    this.mostraModale = true;
  }

  chiudiModale() {
    this.mostraModale = false;
  }

  // CORRECTIONS
  apriCorrezione() {
    this.cambiaVista('activeMobility');
    this.activePanel = 'correction';

    if (this.richiestaAttiva.exams) {
      this.nuoviEsamiLA = this.richiestaAttiva.exams.map((e: any) => ({
        foreignCode: e.foreign_course_code,
        foreignName: e.foreign_course_name,
        foreignCredits: e.foreign_course_credits,
        localCode: e.unive_course_code,
        localName: e.unive_course_title,
        localCredits: e.unive_course_credits,
      }));
    } else {
      this.aggiungiEsameLA();
    }
  }

  // DATABASE CALLS FOR ACTIONS
  eseguiAzione() {
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    const appId = this.richiestaAttiva.id;
    let fetchPromise: Promise<any>;

    // START OR UPDATE DATES
    if (
      this.modalConfig.action === 'start_mobility' ||
      this.modalConfig.action === 'update_dates'
    ) {
      const isStart = this.modalConfig.action === 'start_mobility';
      fetchPromise = fetch(`http://localhost:3000/api/applications/${appId}/dates`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          arrival_date: this.richiestaAttiva.arrival_date,
          departure_date: this.richiestaAttiva.departure_date,
          start_mobility: isStart,
        }),
      });
    }
    // RENUNCIATION
    else if (this.modalConfig.action === 'reject_mobility') {
      fetchPromise = fetch(`http://localhost:3000/api/applications/${appId}/cancel`, {
        method: 'PUT',
      });
    }
    // LEARNING AGREEMENT MODIFICATION
    else if (this.modalConfig.action === 'submit_la') {
      const formData = new FormData();
      formData.append('exams', JSON.stringify(this.nuoviEsamiLA));
      formData.append('reason', this.motivoVariazioneLA);
      if (this.fileLA) formData.append('learning_agreement_file', this.fileLA);

      fetchPromise = fetch(`http://localhost:3000/api/applications/${appId}/modify-la`, {
        method: 'PUT',
        body: formData,
      });
    }
    // GRADES UPDATE (ToR)
    else if (this.modalConfig.action === 'submit_tor') {
      const formData = new FormData();
      formData.append('exams', JSON.stringify(this.esamiToR));
      if (this.fileToR) formData.append('tor_file', this.fileToR);

      fetchPromise = fetch(`http://localhost:3000/api/applications/${appId}/tor`, {
        method: 'POST',
        body: formData,
      });
    }
    // RE-SEND
    else if (this.modalConfig.action === 'resubmit_modification') {
      const formData = new FormData();
      formData.append('exams', JSON.stringify(this.nuoviEsamiLA));
      if (this.fileLA) formData.append('learning_agreement_file', this.fileLA);

      fetchPromise = fetch(
        `http://localhost:3000/api/applications/${appId}/resubmit-modification`,
        {
          method: 'PUT',
          body: formData,
        },
      );
    } else {
      return;
    }

    // Response Managment
    fetchPromise
      .then((res) => {
        if (!res.ok) throw new Error("Errore durante l'operazione server");
        return res.json();
      })
      .then(() => {
        this.activePanel = null;
        this.mostraModale = false;
        alert('✅ Operazione registrata con successo nel database!');

        this.caricaDatiReali(appId);
      })
      .catch((err) => {
        alert(err.message);
        this.mostraModale = false;
      })
      .finally(() => {
        this.isSubmitting = false;
      });
  }

  tornaIndietro(event: Event) {
    event.preventDefault();
    this.onBack.emit();
  }

  // FILE MANAGMENT
  onFileLASelected(event: any) {
    if (event.target.files.length > 0) this.fileLA = event.target.files[0];
  }

  onFileToRSelected(event: any) {
    if (event.target.files.length > 0) this.fileToR = event.target.files[0];
  }
}
