import { Component, OnInit, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-active-mobility',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './active-mobility.component.html',
  styleUrls: ['./active-mobility.component.css'],
})
export class ActiveMobilityComponent implements OnInit {
  @Input() utente: any;
  @Input() pratica: any;
  @Output() onBack = new EventEmitter<void>();
  @Output() onLogout = new EventEmitter<void>();

  menuAperto: boolean = false;
  activeView: 'activeMobility' | 'modifications' = 'activeMobility';
  activePanel: string | null = null;
  richiestaAttiva: any = null;

  nuoviEsamiLA: any[] = [];
  esamiToR: any[] = [];
  mostraModale: boolean = false;
  modalConfig: any = { icon: '', title: '', text: '', action: '', btnClass: '', btnText: '' };

  mostraAlert: boolean = false;
  alertType: 'success' | 'error' = 'success';
  alertMessage: string = '';

  motivoRinuncia: string = '';
  motivoVariazioneLA: string = '';
  isSubmitting: boolean = false;
  fileLA: File | null = null;
  fileToR: File | null = null;

  constructor(
    private cdr: ChangeDetectorRef,
    public themeService: ThemeService,
  ) {}

  get iniziali(): string {
    if (!this.utente) return 'ST';
    return (this.utente.first_name.charAt(0) + this.utente.last_name.charAt(0)).toUpperCase();
  }

  get hasNotifiche(): boolean {
    if (!this.richiestaAttiva || !this.richiestaAttiva.documents) return false;
    return this.richiestaAttiva.documents.some((doc: any) => doc.status === 'REJECTED');
  }

  get hasPendingModifications(): boolean {
    if (!this.richiestaAttiva || !this.richiestaAttiva.documents) return false;
    return this.richiestaAttiva.documents.some(
      (doc: any) => doc.document_type === 'LEARNING_AGREEMENT' && doc.status === 'PENDING',
    );
  }

  formattaStato(status: string): string {
    if (!status) return '';
    return status.replace(/_/g, ' ');
  }

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
        if (data.documents && data.documents.length > 0) {
          data.documents.sort((a: any, b: any) => {
            return new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime();
          });
        }
        this.richiestaAttiva = data;
        this.cdr.detectChanges();
      })
      .catch((err) => console.error('Errore fetch database:', err));
  }

  cambiaVista(vista: 'activeMobility' | 'modifications') {
    this.activeView = vista;
  }

  // LOGICA AGGIORNATA PER L'APERTURA DEI PANNELLI
  togglePanel(panel: string) {
    this.activePanel = this.activePanel === panel ? null : panel;

    // Se lo studente vuole proporre una NUOVA modifica (L.A.), partiamo dagli esami UFFICIALI (is_proposed_change = false/0)
    if (panel === 'la') {
      if (this.richiestaAttiva && this.richiestaAttiva.exams) {
        const esamiUfficiali = this.richiestaAttiva.exams.filter((e: any) => !e.is_proposed_change);
        this.popolaArrayEsami(esamiUfficiali, this.nuoviEsamiLA);
      }
      if (this.nuoviEsamiLA.length === 0) this.aggiungiEsameLA();
    }

    // Se lo studente vuole chiudere l'Erasmus (ToR), partiamo dagli esami UFFICIALI
    if (panel === 'tor') {
      if (this.richiestaAttiva && this.richiestaAttiva.exams) {
        const esamiUfficiali = this.richiestaAttiva.exams.filter((e: any) => !e.is_proposed_change);
        this.popolaArrayEsami(esamiUfficiali, this.esamiToR);
      }
      if (this.esamiToR.length === 0) this.aggiungiEsameToR();
    }
  }

  // LOGICA AGGIORNATA PER LA CORREZIONE DI UN RIFIUTO
  apriCorrezione() {
    this.cambiaVista('activeMobility');
    this.activePanel = 'correction';

    if (this.richiestaAttiva && this.richiestaAttiva.exams) {
      // Quando correggiamo un rifiuto, cerchiamo di mostrare la PROPOSTA rifiutata (is_proposed_change = true/1)
      const esamiProposti = this.richiestaAttiva.exams.filter((e: any) => !!e.is_proposed_change);

      // Se il backend li ha già cancellati (come da tua logica di "pulizia" su rifiuto),
      // ricarichiamo gli esami ufficiali originali come base per la nuova proposta.
      if (esamiProposti.length > 0) {
        this.popolaArrayEsami(esamiProposti, this.nuoviEsamiLA);
      } else {
        const esamiUfficiali = this.richiestaAttiva.exams.filter((e: any) => !e.is_proposed_change);
        this.popolaArrayEsami(esamiUfficiali, this.nuoviEsamiLA);
      }
    }

    if (this.nuoviEsamiLA.length === 0) {
      this.aggiungiEsameLA();
    }
  }

  // UTILITY PER POPOLARE GLI ARRAY (Mantiene il codice pulito)
  popolaArrayEsami(sorgente: any[], destinazione: any[]) {
    // Svuota l'array di destinazione prima di riempirlo
    destinazione.splice(0, destinazione.length);
    const mappatura = sorgente.map((e: any) => ({
      foreignCode: e.foreign_course_code,
      foreignName: e.foreign_course_name,
      foreignCredits: e.foreign_course_credits,
      localCode: e.unive_course_code,
      localName: e.unive_course_title,
      localCredits: e.unive_course_credits,
      score: e.score_obtained || '', // Aggiunto per il ToR
      date: e.exam_date ? e.exam_date.substring(0, 10) : '', // Aggiunto per il ToR
    }));
    destinazione.push(...mappatura);
  }

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

  apriModaleConferma(azione: string) {
    this.modalConfig.action = azione;
    this.motivoRinuncia = '';
    switch (azione) {
      case 'start_mobility':
        if (!this.richiestaAttiva.arrival_date || !this.richiestaAttiva.departure_date) {
          this.mostraFeedback('error', 'Inserisci entrambe le date per proseguire.');
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
      case 'update_dates':
        if (!this.richiestaAttiva.arrival_date || !this.richiestaAttiva.departure_date) {
          this.mostraFeedback('error', 'Inserisci entrambe le date per salvare.');
          return;
        }
        this.modalConfig = {
          action: azione,
          icon: '📅',
          title: 'Modifica Date',
          text: 'Vuoi salvare le nuove date per la tua mobilità in corso?',
          btnClass: 'btn-primary',
          btnText: 'Salva Date',
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

  eseguiAzione() {
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    const appId = this.richiestaAttiva.id;
    let fetchPromise: Promise<any>;

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
    } else if (this.modalConfig.action === 'reject_mobility') {
      fetchPromise = fetch(`http://localhost:3000/api/applications/${appId}/cancel`, {
        method: 'PUT',
      });
    } else if (this.modalConfig.action === 'submit_la') {
      const payloadEsami = this.nuoviEsamiLA.map((e) => ({ ...e, is_proposed_change: true }));

      const formData = new FormData();
      formData.append('exams', JSON.stringify(payloadEsami));
      formData.append('reason', this.motivoVariazioneLA);
      if (this.fileLA) formData.append('learning_agreement_file', this.fileLA);
      fetchPromise = fetch(`http://localhost:3000/api/applications/${appId}/modify-la`, {
        method: 'PUT',
        body: formData,
      });
    } else if (this.modalConfig.action === 'submit_tor') {
      const formData = new FormData();
      formData.append('exams', JSON.stringify(this.esamiToR));
      if (this.fileToR) formData.append('tor_file', this.fileToR);
      fetchPromise = fetch(`http://localhost:3000/api/applications/${appId}/tor`, {
        method: 'POST',
        body: formData,
      });
    } else if (this.modalConfig.action === 'resubmit_modification') {
      // Anche qui diciamo al server che questi esami sono le nuove proposte
      const payloadEsami = this.nuoviEsamiLA.map((e) => ({ ...e, is_proposed_change: true }));

      const formData = new FormData();
      formData.append('exams', JSON.stringify(payloadEsami));
      if (this.fileLA) formData.append('learning_agreement_file', this.fileLA);
      fetchPromise = fetch(
        `http://localhost:3000/api/applications/${appId}/resubmit-modification`,
        { method: 'PUT', body: formData },
      );
    } else {
      return;
    }

    fetchPromise
      .then((res) => {
        if (!res.ok) throw new Error("Errore durante l'operazione server");
        return res.json();
      })
      .then(() => {
        this.activePanel = null;
        this.mostraModale = false;
        this.mostraFeedback('success', 'Operazione registrata con successo!');
        this.caricaDatiReali(appId);
      })
      .catch((err) => {
        this.mostraModale = false;
        // Se c'è un errore, lo mostriamo col toast e sblocchiamo il pulsante!
        this.mostraFeedback('error', err.message);
      })
      .finally(() => {
        this.isSubmitting = false;
      });
  }

  tornaIndietro(event: Event) {
    event.preventDefault();
    this.onBack.emit();
  }
  toggleMenu(event: Event) {
    event.stopPropagation();
    this.menuAperto = !this.menuAperto;
  }
  effettuaLogout(event: Event) {
    event.preventDefault();
    this.onLogout.emit();
  }
  onFileLASelected(event: any) {
    if (event.target.files.length > 0) this.fileLA = event.target.files[0];
  }
  onFileToRSelected(event: any) {
    if (event.target.files.length > 0) this.fileToR = event.target.files[0];
  }
}
