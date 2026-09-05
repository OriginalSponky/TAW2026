import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Servizi e i18n
import { ThemeService } from '../services/theme.service';
import { TranslationService } from '../services/translation.service';
import { TranslatePipe } from '../translate.pipe';

@Component({
  selector: 'app-staff-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './staff-dashboard.component.html',
  styleUrls: ['./staff-dashboard.component.css'],
})
export class StaffDashboardComponent implements OnInit {
  @Input() utente: any;
  @Output() onLogout = new EventEmitter<void>();

  menuAperto: boolean = false;
  activeView: 'homeView' | 'preDepartureView' | 'closureView' | 'allAppsView' = 'homeView';

  allApps: any[] = [];
  preDepartureApps: any[] = [];
  closureApps: any[] = [];
  praticheFiltrate: any[] = [];

  uniqueNazioni: string[] = [];
  uniqueIstituzioni: string[] = [];

  filtri = {
    studente: '',
    docente: '',
    stato: '',
    nazione: '',
    istituzione: '',
  };

  mostraModaleReview: boolean = false;
  modalStep: 'read' | 'reject-reason' | 'confirm' | 'success' = 'read';
  reviewData: any = {};
  pendingAction: 'approve' | 'reject' | null = null;
  motivoRifiuto: string = '';

  mostraModaleDettagli: boolean = false;
  appSelezionata: any = null;

  constructor(
    public themeService: ThemeService,
    public translationService: TranslationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.caricaPratiche();
  }

  get iniziali(): string {
    if (!this.utente) return 'ST';
    return (this.utente.first_name.charAt(0) + this.utente.last_name.charAt(0)).toUpperCase();
  }

  caricaPratiche() {
    fetch(`http://localhost:3000/api/staff/applications`)
      .then((res) => res.json())
      .then((data) => {
        this.allApps = data.map((a: any) => ({
          ...a,
          name: `${a.student_first_name} ${a.student_last_name}`,
        }));

        this.uniqueNazioni = [...new Set(this.allApps.map((a) => a.country))]
          .filter(Boolean)
          .sort() as string[];
        this.uniqueIstituzioni = [...new Set(this.allApps.map((a) => a.institution))]
          .filter(Boolean)
          .sort() as string[];

        this.preDepartureApps = this.allApps.filter((a) => a.status === 'PRE_DEPARTURE_COMPLETED');
        this.closureApps = this.allApps.filter((a) => a.status === 'EXAM_SCORES_APPROVED');

        this.praticheFiltrate = [...this.allApps];
        this.cdr.detectChanges();
      })
      .catch((err) => console.error('Errore recupero archivio:', err));
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
      case 'EXAM_SCORES_APPROVED':
        return 'status-exam-approved';
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
        return this.translationService.translate('MY_REQ.STATUS_CREATED');
      case 'AWAITING_FOR_APPROVAL':
        return this.translationService.translate('MY_REQ.STATUS_AW_LA');
      case 'PRE_DEPARTURE_COMPLETED':
        return this.translationService.translate('MY_REQ.STATUS_PRE_DEP');
      case 'MOBILITY_IN_PROGRESS':
        return this.translationService.translate('MY_REQ.STATUS_MOB_PROG');
      case 'AWAITING_MODIFICATION_APPROVAL':
        return this.translationService.translate('MY_REQ.STATUS_AW_MOD');
      case 'WAITING_FOR_EXAM_SCORE_APPROVAL':
        return this.translationService.translate('MY_REQ.STATUS_AW_SCORE');
      case 'EXAM_SCORES_APPROVED':
        return this.translationService.translate('MY_REQ.STATUS_EXAM_APP');
      case 'CLOSED':
        return this.translationService.translate('MY_REQ.STATUS_CLOSED');
      case 'CANCELED':
        return this.translationService.translate('MY_REQ.STATUS_CANCELED');
      default:
        return this.translationService.translate('MY_REQ.STATUS_UNKNOWN');
    }
  }

  // --- NUOVA FUNZIONE: TRADUCE IL SEMESTRE ---
  formattaPeriodo(periodo: string): string {
    if (!periodo) return '';
    switch (periodo) {
      case 'FIRST_SEMESTER':
        return this.translationService.translate('REQ_DETAIL.FIRST_SEM');
      case 'SECOND_SEMESTER':
        return this.translationService.translate('REQ_DETAIL.SECOND_SEM');
      case 'FULL_YEAR':
        return this.translationService.translate('REQ_DETAIL.FULL_YEAR');
      default:
        return periodo;
    }
  }

  applicaFiltri() {
    this.praticheFiltrate = this.allApps.filter((app) => {
      const matchStudente =
        !this.filtri.studente ||
        app.name.toLowerCase().includes(this.filtri.studente.toLowerCase()) ||
        (app.matricola && app.matricola.includes(this.filtri.studente));
      const matchDocente =
        !this.filtri.docente ||
        app.teacher.toLowerCase().includes(this.filtri.docente.toLowerCase());
      const matchStato = !this.filtri.stato || app.status === this.filtri.stato;
      const matchNazione = !this.filtri.nazione || app.country === this.filtri.nazione;
      const matchIstituzione =
        !this.filtri.istituzione || app.institution === this.filtri.istituzione;

      return matchStudente && matchDocente && matchStato && matchNazione && matchIstituzione;
    });
    this.cdr.detectChanges();
  }

  resettaFiltri() {
    this.filtri = { studente: '', docente: '', stato: '', nazione: '', istituzione: '' };
    this.praticheFiltrate = [...this.allApps];
    this.cdr.detectChanges();
  }

  apriDettagli(id: number) {
    const basicApp = this.allApps.find((a) => a.id === id);

    fetch(`http://localhost:3000/api/applications/${id}`)
      .then((res) => res.json())
      .then((details) => {
        this.appSelezionata = {
          ...basicApp,
          ...details,
          documents: details.documents,
        };
        this.mostraModaleDettagli = true;
        this.cdr.detectChanges();
      });
  }

  startReview(app: any, actionType: 'pre-departure' | 'closure', docType: string) {
    fetch(`http://localhost:3000/api/applications/${app.id}`)
      .then((res) => res.json())
      .then((details) => {
        const dbDocType =
          actionType === 'pre-departure' ? 'LEARNING_AGREEMENT' : 'TRANSCRIPT_OF_RECORDS';

        const relevantDocs = details.documents.filter((d: any) => d.document_type === dbDocType);
        const pendingDoc = relevantDocs.length > 0 ? relevantDocs[relevantDocs.length - 1] : null;

        const fallbackText = this.translationService.translate('STAFF.NO_DOC_FOUND');

        const formatData = (dataStr: string) => {
          if (!dataStr) return '';
          return new Date(dataStr).toLocaleDateString('it-IT');
        };

        const fromStr = this.translationService.translate('STAFF.FROM');
        const toStr = this.translationService.translate('STAFF.TO');
        const missingStr = this.translationService.translate('STAFF.MISSING_DATES');

        const datesText =
          details.actual_arrival_date && details.actual_departure_date
            ? `${fromStr} ${formatData(details.actual_arrival_date)} ${toStr} ${formatData(details.actual_departure_date)}`
            : missingStr;

        this.reviewData = {
          appId: app.id,
          studentName: `🧑‍🎓 Studente: ${app.name} (Mat. ${app.matricola})`,
          actionType: actionType,
          docName: pendingDoc ? pendingDoc.file_name : fallbackText,
          docUrl: pendingDoc ? `http://localhost:3000${pendingDoc.file_path}` : '#',
          profName: app.teacher,
          datesText: datesText,
        };

        this.modalStep = 'read';
        this.motivoRifiuto = '';
        this.pendingAction = null;
        this.mostraModaleReview = true;
        this.cdr.detectChanges();
      });
  }

  impostaStep(step: 'read' | 'reject-reason' | 'confirm') {
    this.modalStep = step;
  }

  chiediConferma(action: 'approve' | 'reject') {
    this.pendingAction = action;
    this.modalStep = 'confirm';
  }

  eseguiAzione() {
    fetch(`http://localhost:3000/api/staff/applications/${this.reviewData.appId}/review`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionType: this.reviewData.actionType,
        action: this.pendingAction === 'approve' ? 'APPROVE' : 'REJECT',
        rejection_reason: this.pendingAction === 'reject' ? this.motivoRifiuto : null,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Errore server');
        this.modalStep = 'success';
        this.caricaPratiche();
        this.cdr.detectChanges();
      })
      .catch((err) => console.error(err));
  }

  chiudiReviewModal() {
    this.mostraModaleReview = false;
    this.cdr.detectChanges();
  }

  chiudiSuccesso() {
    this.chiudiReviewModal();
  }

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.menuAperto = !this.menuAperto;
  }

  effettuaLogout(event: Event) {
    event.preventDefault();
    this.onLogout.emit();
  }

  switchView(view: 'homeView' | 'preDepartureView' | 'closureView' | 'allAppsView') {
    this.activeView = view;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.cdr.detectChanges();
  }
}
