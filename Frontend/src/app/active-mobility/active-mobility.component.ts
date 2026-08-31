import {
  Component,
  OnInit,
  ChangeDetectorRef,
  Input,
  Output,
  EventEmitter,
  HostListener,
} from '@angular/core';
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
  @Input() pratica: any; // Mantenuto per compatibilità, ma ora peschiamo tutte le attive
  @Output() onBack = new EventEmitter<void>();
  @Output() onLogout = new EventEmitter<void>();

  menuAperto: boolean = false;
  activeView: 'activeMobility' | 'modifications' = 'activeMobility';

  // ARRAY CON TUTTE LE MOBILITÀ ATTIVE DELLO STUDENTE
  richiesteAttive: any[] = [];

  // SELEZIONE PER IL DROPDOWN NELLA VISTA "STATO MODIFICHE"
  selectedHistoryApp: any = null;
  historyDropdownAperto: boolean = false;

  // MODALE CONFERMA
  mostraModale: boolean = false;
  modalConfig: any = { icon: '', title: '', text: '', action: '', btnClass: '', btnText: '' };
  appInModifica: any = null;
  motivoRinuncia: string = '';
  isSubmitting: boolean = false;

  // TOAST
  mostraAlert: boolean = false;
  alertType: 'success' | 'error' = 'success';
  alertMessage: string = '';

  constructor(
    private cdr: ChangeDetectorRef,
    public themeService: ThemeService,
  ) {}

  get iniziali(): string {
    if (!this.utente) return 'ST';
    return (this.utente.first_name.charAt(0) + this.utente.last_name.charAt(0)).toUpperCase();
  }

  // Notifica globale se ALMENO UNA pratica ha documenti rifiutati
  get hasNotifiche(): boolean {
    if (!this.richiesteAttive) return false;
    return this.richiesteAttive.some(
      (app) => app.documents && app.documents.some((doc: any) => doc.status === 'REJECTED'),
    );
  }

  hasPendingModifications(app: any): boolean {
    if (!app.documents) return false;
    return app.documents.some(
      (doc: any) => doc.document_type === 'LEARNING_AGREEMENT' && doc.status === 'PENDING',
    );
  }

  formattaStato(status: string): string {
    if (!status) return '';
    return status.replace(/_/g, ' ');
  }

  ngOnInit() {
    this.caricaTutteLeAttive();
  }

  // CHIUSURA DROPDOWN CLICCANDO FUORI
  @HostListener('document:click')
  clickout() {
    this.menuAperto = false;
    this.historyDropdownAperto = false;
  }

  caricaTutteLeAttive() {
    const emailSicura = encodeURIComponent(this.utente.email);
    fetch(`http://localhost:3000/api/applications?email=${emailSicura}`)
      .then((res) => res.json())
      .then((data) => {
        // Filtriamo per ottenere SOLO le pratiche attive (non in bozza, non chiuse o annullate)
        const statiAttivi = [
          'AWAITING_FOR_APPROVAL',
          'PRE_DEPARTURE_COMPLETED',
          'MOBILITY_IN_PROGRESS',
          'AWAITING_MODIFICATION_APPROVAL',
          'WAITING_FOR_EXAM_SCORE_APPROVAL',
        ];
        const activeApps = data.filter((a: any) => statiAttivi.includes(a.status));

        // Facciamo una fetch dettagliata per ogni pratica attiva (per avere esami e documenti)
        const promises = activeApps.map((a: any) =>
          fetch(`http://localhost:3000/api/applications/${a.id}`).then((res) => res.json()),
        );

        Promise.all(promises).then((detailedApps) => {
          this.richiesteAttive = detailedApps.map((app) => {
            // Ordina cronologia documenti
            if (app.documents && app.documents.length > 0) {
              app.documents.sort(
                (a: any, b: any) =>
                  new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime(),
              );
            }
            // Inizializza lo stato indipendente per ogni singola card
            return {
              ...app,
              activePanel: null,
              nuoviEsamiLA: [],
              esamiToR: [],
              fileLA: null,
              fileToR: null,
              fileCorrection: null,
              motivoVariazioneLA: '',
            };
          });

          // Seleziona la prima pratica attiva come default per la vista Storico File
          if (this.richiesteAttive.length > 0) {
            // Mantiene la selezione precedente se esiste, altrimenti prende la prima
            if (this.selectedHistoryApp) {
              this.selectedHistoryApp =
                this.richiesteAttive.find((a) => a.id === this.selectedHistoryApp.id) ||
                this.richiesteAttive[0];
            } else {
              this.selectedHistoryApp = this.richiesteAttive[0];
            }
          } else {
            this.selectedHistoryApp = null;
          }

          this.cdr.detectChanges();
        });
      })
      .catch((err) => console.error('Errore fetch database:', err));
  }

  cambiaVista(vista: 'activeMobility' | 'modifications') {
    this.activeView = vista;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // GESTIONE DROPDOWN STORICO MODIFICHE
  toggleHistoryDropdown(event: Event) {
    event.stopPropagation();
    this.historyDropdownAperto = !this.historyDropdownAperto;
    this.menuAperto = false;
  }

  selezionaHistoryApp(app: any, event: Event) {
    event.stopPropagation();
    this.selectedHistoryApp = app;
    this.historyDropdownAperto = false;
  }

  // APERTURA PANNELLI PER SPECIFICA PRATICA
  togglePanel(app: any, panel: string) {
    app.activePanel = app.activePanel === panel ? null : panel;

    if (panel === 'la') {
      if (app.exams) {
        const esamiUfficiali = app.exams.filter((e: any) => !e.is_proposed_change);
        this.popolaArrayEsami(esamiUfficiali, app.nuoviEsamiLA);
      }
      if (app.nuoviEsamiLA.length === 0) this.aggiungiEsameLA(app);
    }

    if (panel === 'tor') {
      if (app.exams) {
        const esamiUfficiali = app.exams.filter((e: any) => !e.is_proposed_change);
        this.popolaArrayEsami(esamiUfficiali, app.esamiToR);
      }
      if (app.esamiToR.length === 0) this.aggiungiEsameToR(app);
    }
  }

  apriCorrezione(app: any) {
    this.cambiaVista('activeMobility');
    app.activePanel = 'correction';

    if (app.exams) {
      const esamiProposti = app.exams.filter((e: any) => !!e.is_proposed_change);
      if (esamiProposti.length > 0) {
        this.popolaArrayEsami(esamiProposti, app.nuoviEsamiLA);
      } else {
        const esamiUfficiali = app.exams.filter((e: any) => !e.is_proposed_change);
        this.popolaArrayEsami(esamiUfficiali, app.nuoviEsamiLA);
      }
    }
    if (app.nuoviEsamiLA.length === 0) this.aggiungiEsameLA(app);

    // Scorri giù verso la pratica interessata
    setTimeout(() => {
      document
        .getElementById('app-card-' + app.id)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  popolaArrayEsami(sorgente: any[], destinazione: any[]) {
    destinazione.splice(0, destinazione.length);
    const mappatura = sorgente.map((e: any) => ({
      foreignCode: e.foreign_course_code,
      foreignName: e.foreign_course_name,
      foreignCredits: e.foreign_course_credits,
      localCode: e.unive_course_code,
      localName: e.unive_course_title,
      localCredits: e.unive_course_credits,
      score: e.score_obtained || '',
      date: e.exam_date ? e.exam_date.substring(0, 10) : '',
    }));
    destinazione.push(...mappatura);
  }

  // AGGIUNTA/RIMOZIONE ESAMI NELLE SPECIFICHE CARD
  aggiungiEsameLA(app: any) {
    app.nuoviEsamiLA.push({
      foreignCode: '',
      foreignName: '',
      foreignCredits: null,
      localCode: '',
      localName: '',
      localCredits: null,
    });
  }
  rimuoviEsameLA(app: any, indice: number) {
    app.nuoviEsamiLA.splice(indice, 1);
  }
  aggiungiEsameToR(app: any) {
    app.esamiToR.push({
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
  rimuoviEsameToR(app: any, indice: number) {
    app.esamiToR.splice(indice, 1);
  }

  // FILE UPLOAD TRIGGERS
  triggerFileInput(id: string) {
    document.getElementById(id)?.click();
  }

  onFileLASelected(event: any, app: any) {
    if (event.target.files.length > 0) app.fileLA = event.target.files[0];
  }
  onFileToRSelected(event: any, app: any) {
    if (event.target.files.length > 0) app.fileToR = event.target.files[0];
  }
  onFileCorrectionSelected(event: any, app: any) {
    if (event.target.files.length > 0) app.fileCorrection = event.target.files[0];
  }

  // MODALE CONFERMA
  apriModaleConferma(azione: string, app: any) {
    this.appInModifica = app;
    this.modalConfig.action = azione;
    this.motivoRinuncia = '';

    switch (azione) {
      case 'start_mobility':
        if (!app.arrival_date || !app.departure_date) {
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
        if (!app.arrival_date || !app.departure_date) {
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
    this.appInModifica = null;
  }

  eseguiAzione() {
    if (this.isSubmitting || !this.appInModifica) return;
    this.isSubmitting = true;

    const app = this.appInModifica;
    const appId = app.id;
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
          arrival_date: app.arrival_date,
          departure_date: app.departure_date,
          start_mobility: isStart,
        }),
      });
    } else if (this.modalConfig.action === 'reject_mobility') {
      fetchPromise = fetch(`http://localhost:3000/api/applications/${appId}/cancel`, {
        method: 'PUT',
      });
    } else if (this.modalConfig.action === 'submit_la') {
      const payloadEsami = app.nuoviEsamiLA.map((e: any) => ({ ...e, is_proposed_change: true }));
      const formData = new FormData();
      formData.append('exams', JSON.stringify(payloadEsami));
      formData.append('reason', app.motivoVariazioneLA);
      if (app.fileLA) formData.append('learning_agreement_file', app.fileLA);
      fetchPromise = fetch(`http://localhost:3000/api/applications/${appId}/modify-la`, {
        method: 'PUT',
        body: formData,
      });
    } else if (this.modalConfig.action === 'submit_tor') {
      const formData = new FormData();
      formData.append('exams', JSON.stringify(app.esamiToR));
      if (app.fileToR) formData.append('tor_file', app.fileToR);
      fetchPromise = fetch(`http://localhost:3000/api/applications/${appId}/tor`, {
        method: 'POST',
        body: formData,
      });
    } else if (this.modalConfig.action === 'resubmit_modification') {
      const payloadEsami = app.nuoviEsamiLA.map((e: any) => ({ ...e, is_proposed_change: true }));
      const formData = new FormData();
      formData.append('exams', JSON.stringify(payloadEsami));
      if (app.fileCorrection) formData.append('learning_agreement_file', app.fileCorrection);
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
        this.mostraModale = false;
        this.mostraFeedback('success', 'Operazione registrata con successo!');
        this.caricaTutteLeAttive(); // Ricarica tutto dal DB
      })
      .catch((err) => {
        this.mostraModale = false;
        this.mostraFeedback('error', err.message);
      })
      .finally(() => {
        this.isSubmitting = false;
      });
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

  tornaIndietro(event: Event) {
    event.preventDefault();
    this.onBack.emit();
  }
  toggleMenu(event: Event) {
    event.stopPropagation();
    this.menuAperto = !this.menuAperto;
    this.historyDropdownAperto = false;
  }
  effettuaLogout(event: Event) {
    event.preventDefault();
    this.onLogout.emit();
  }
}
