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
import { TranslationService } from '../services/translation.service';
import { TranslatePipe } from '../translate.pipe';

@Component({
  selector: 'app-active-mobility',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
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

  richiesteAttive: any[] = [];

  selectedHistoryApp: any = null;
  historyDropdownAperto: boolean = false;

  mostraModale: boolean = false;
  modalConfig: any = { icon: '', titleKey: '', textKey: '', action: '', btnClass: '', btnKey: '' };
  appInModifica: any = null;
  motivoRinuncia: string = '';
  isSubmitting: boolean = false;

  mostraAlert: boolean = false;
  alertType: 'success' | 'error' = 'success';
  alertMessage: string = '';

  constructor(
    private cdr: ChangeDetectorRef,
    public themeService: ThemeService,
    public translationService: TranslationService,
  ) {}

  get iniziali(): string {
    if (!this.utente) return '';
    return (this.utente.first_name.charAt(0) + this.utente.last_name.charAt(0)).toUpperCase();
  }

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
        const statiAttivi = [
          'AWAITING_FOR_APPROVAL',
          'PRE_DEPARTURE_COMPLETED',
          'MOBILITY_IN_PROGRESS',
          'AWAITING_MODIFICATION_APPROVAL',
          'WAITING_FOR_EXAM_SCORE_APPROVAL',
          'EXAM_SCORES_APPROVED',
        ];
        const activeApps = data.filter((a: any) => statiAttivi.includes(a.status));

        const promises = activeApps.map((a: any) =>
          fetch(`http://localhost:3000/api/applications/${a.id}`).then((res) => res.json()),
        );

        Promise.all(promises).then((detailedApps) => {
          this.richiesteAttive = detailedApps.map((app) => {
            if (app.documents && app.documents.length > 0) {
              app.documents.sort(
                (a: any, b: any) =>
                  new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime(),
              );
            }
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

          if (this.richiesteAttive.length > 0) {
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

  apriModaleConferma(azione: string, app: any) {
    this.appInModifica = app;
    this.modalConfig.action = azione;
    this.motivoRinuncia = '';

    switch (azione) {
      case 'start_mobility':
      case 'update_dates':
      case 'save_dates': // NUOVA AZIONE
        if (!app.arrival_date || !app.departure_date) {
          this.mostraFeedback(
            'error',
            this.translationService.translate('ACTIVE_MOBILITY.ERR_DATES'),
          );
          return;
        }

        let titleKey = 'ACTIVE_MOBILITY.MODAL_DATES_TITLE';
        let textKey = 'Vuoi salvare le date e inviare la richiesta di approvazione al docente?';
        let btnKey = 'Invia al Docente';

        if (azione === 'start_mobility') {
          titleKey = 'ACTIVE_MOBILITY.MODAL_START_TITLE';
          textKey = 'ACTIVE_MOBILITY.MODAL_START_TEXT';
          btnKey = 'ACTIVE_MOBILITY.BTN_START_CONFIRM';
        } else if (azione === 'update_dates') {
          titleKey = 'ACTIVE_MOBILITY.MODAL_DATES_TITLE';
          textKey = 'ACTIVE_MOBILITY.MODAL_DATES_TEXT';
          btnKey = 'ACTIVE_MOBILITY.BTN_DATES_CONFIRM';
        }

        this.modalConfig = {
          action: azione,
          icon: '📅',
          titleKey: titleKey,
          textKey: textKey,
          btnClass: 'btn-primary',
          btnKey: btnKey,
        };
        break;
      case 'reject_mobility':
        this.modalConfig = {
          action: azione,
          icon: '⚠️',
          titleKey: 'ACTIVE_MOBILITY.MODAL_REJECT_TITLE',
          textKey: 'ACTIVE_MOBILITY.MODAL_REJECT_TEXT',
          btnClass: 'btn-danger-outline',
          btnKey: 'ACTIVE_MOBILITY.BTN_REJECT_CONFIRM',
        };
        break;
      case 'submit_la':
        this.modalConfig = {
          action: azione,
          icon: '📝',
          titleKey: 'ACTIVE_MOBILITY.MODAL_LA_TITLE',
          textKey: 'ACTIVE_MOBILITY.MODAL_LA_TEXT',
          btnClass: 'btn-primary',
          btnKey: 'ACTIVE_MOBILITY.BTN_LA_CONFIRM',
        };
        break;
      case 'submit_tor':
        // NUOVO CONTROLLO: Verifica che ci sia almeno un esame e che Voto e Data siano compilati per TUTTI
        if (!app.esamiToR || app.esamiToR.length === 0) {
          this.mostraFeedback(
            'error',
            this.translationService.translate('ACTIVE_MOBILITY.ERR_MISSING_TOR_DATA'),
          );
          return;
        }

        const datiMancanti = app.esamiToR.some(
          (e: any) =>
            !e.score || String(e.score).trim() === '' || !e.date || String(e.date).trim() === '',
        );
        if (datiMancanti) {
          this.mostraFeedback(
            'error',
            this.translationService.translate('ACTIVE_MOBILITY.ERR_MISSING_TOR_DATA'),
          );
          return;
        }

        this.modalConfig = {
          action: azione,
          icon: '🎓',
          titleKey: 'ACTIVE_MOBILITY.MODAL_TOR_TITLE',
          textKey: 'ACTIVE_MOBILITY.MODAL_TOR_TEXT',
          btnClass: 'btn-success',
          btnKey: 'ACTIVE_MOBILITY.BTN_TOR_CONFIRM',
        };
        break;
      case 'resubmit_modification':
        this.modalConfig = {
          action: azione,
          icon: '🔄',
          titleKey: 'ACTIVE_MOBILITY.MODAL_RESUBMIT_TITLE',
          textKey: 'ACTIVE_MOBILITY.MODAL_RESUBMIT_TEXT',
          btnClass: 'btn-primary',
          btnKey: 'ACTIVE_MOBILITY.BTN_RESUBMIT_CONFIRM',
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
      this.modalConfig.action === 'update_dates' ||
      this.modalConfig.action === 'save_dates'
    ) {
      const isStart = this.modalConfig.action === 'start_mobility';

      // Assicuriamoci che le date siano nel formato YYYY-MM-DD
      const formattaDataForDB = (dateObj: Date | string | null) => {
        if (!dateObj) return null;
        const d = new Date(dateObj);
        if (isNaN(d.getTime())) return null; // data non valida
        const month = '' + (d.getMonth() + 1);
        const day = '' + d.getDate();
        const year = d.getFullYear();

        return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
      };

      fetchPromise = fetch(`http://localhost:3000/api/applications/${appId}/dates`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          arrival_date: formattaDataForDB(app.arrival_date),
          departure_date: formattaDataForDB(app.departure_date),
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
        this.mostraFeedback(
          'success',
          this.translationService.translate('ACTIVE_MOBILITY.SUCCESS_OP'),
        );
        this.caricaTutteLeAttive();
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
