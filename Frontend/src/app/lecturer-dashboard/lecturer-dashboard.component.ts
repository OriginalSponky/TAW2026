import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Servizi e i18n
import { ThemeService } from '../services/theme.service';
import { TranslationService } from '../services/translation.service';
import { TranslatePipe } from '../translate.pipe';

@Component({
  selector: 'app-lecturer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './lecturer-dashboard.component.html',
  styleUrls: ['./lecturer-dashboard.component.css'],
})
export class LecturerDashboardComponent implements OnInit {
  @Input() utente: any;
  @Output() onLogout = new EventEmitter<void>();

  menuAperto: boolean = false;
  activeView: 'homeView' | 'laView' | 'torView' | 'handledView' = 'homeView';

  pendingLAs: any[] = [];
  pendingToRs: any[] = [];
  handledApps: any[] = [];
  praticheFiltrate: any[] = [];

  uniqueIstituzioni: string[] = [];
  uniqueAnni: string[] = [];

  filtri = {
    studente: '',
    stato: '',
    anno: '',
    istituzione: '',
  };

  mostraModaleReview: boolean = false;
  modalStep: 'read' | 'reject-reason' | 'confirm' | 'success' = 'read';
  reviewData: any = {};
  pendingAction: 'approve' | 'reject' | null = null;
  motivoRifiuto: string = '';

  mostraModaleStorico: boolean = false;
  historicalDetails: any = null;

  constructor(
    public themeService: ThemeService,
    public translationService: TranslationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.caricaPratiche();
  }

  caricaPratiche() {
    if (!this.utente || !this.utente.email) return;

    fetch(`http://localhost:3000/api/lecturer/applications?email=${this.utente.email}`)
      .then((res) => res.json())
      .then((data) => {
        const praticheVisibili = data;

        // FILTRO AGGIORNATO: AWAITING_FOR_APPROVAL richiede date E un documento caricato
        this.pendingLAs = praticheVisibili.filter(
          (a: any) =>
            a.status === 'CREATED' ||
            (a.status === 'AWAITING_FOR_APPROVAL' &&
              a.actual_arrival_date &&
              a.actual_departure_date &&
              a.pending_docs > 0) ||
            (a.status === 'AWAITING_MODIFICATION_APPROVAL' && a.pending_docs > 0),
        );

        this.pendingToRs = praticheVisibili.filter(
          (a: any) => a.status === 'WAITING_FOR_EXAM_SCORE_APPROVAL' && a.pending_docs > 0,
        );

        // Nello storico ci finisce solo quello che NON rispetta i rigidi criteri qui sopra
        this.handledApps = praticheVisibili.filter((a: any) => {
          const isPendingLA =
            a.status === 'CREATED' ||
            (a.status === 'AWAITING_FOR_APPROVAL' &&
              a.actual_arrival_date &&
              a.actual_departure_date &&
              a.pending_docs > 0) ||
            (a.status === 'AWAITING_MODIFICATION_APPROVAL' && a.pending_docs > 0);

          const isPendingToR = a.status === 'WAITING_FOR_EXAM_SCORE_APPROVAL' && a.pending_docs > 0;

          return !isPendingLA && !isPendingToR;
        });

        this.uniqueIstituzioni = [...new Set(this.handledApps.map((a) => a.institution_name))]
          .filter(Boolean)
          .sort() as string[];
        this.uniqueAnni = [...new Set(this.handledApps.map((a) => a.academic_year))]
          .filter(Boolean)
          .sort() as string[];

        this.praticheFiltrate = [...this.handledApps];
        this.cdr.detectChanges();
      })
      .catch((err) => console.error('Errore recupero pratiche:', err));
  }

  get iniziali(): string {
    if (!this.utente) return 'PR';
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

  switchView(view: 'homeView' | 'laView' | 'torView' | 'handledView') {
    this.activeView = view;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.cdr.detectChanges();
  }

  applicaFiltri() {
    this.praticheFiltrate = this.handledApps.filter((app) => {
      const nomeCompleto = `${app.student_first_name} ${app.student_last_name}`.toLowerCase();
      const searchTerm = this.filtri.studente.toLowerCase();

      const matchStudente =
        !this.filtri.studente ||
        nomeCompleto.includes(searchTerm) ||
        (app.matricola && app.matricola.toLowerCase().includes(searchTerm));
      const matchStato = !this.filtri.stato || app.status === this.filtri.stato;
      const matchAnno = !this.filtri.anno || app.academic_year === this.filtri.anno;
      const matchIstituzione =
        !this.filtri.istituzione || app.institution_name === this.filtri.istituzione;

      return matchStudente && matchStato && matchAnno && matchIstituzione;
    });
    this.cdr.detectChanges();
  }

  resettaFiltri() {
    this.filtri = { studente: '', stato: '', anno: '', istituzione: '' };
    this.praticheFiltrate = [...this.handledApps];
    this.cdr.detectChanges();
  }

  chiediConfermaAccettazione(app: any) {
    this.reviewData = {
      appId: app.id,
      studentName: `${app.student_first_name} ${app.student_last_name} (${app.matricola || 'N/A'})`,
      isAcceptingDraft: true,
    };
    this.pendingAction = 'approve';
    this.modalStep = 'confirm';
    this.mostraModaleReview = true;
    this.cdr.detectChanges();
  }

  valutaBozza(app: any) {
    fetch(`http://localhost:3000/api/applications/${app.id}`)
      .then((res) => res.json())
      .then((details) => {
        let examsHtml = '<ul style="list-style-type: none; padding: 0; margin: 0;">';

        if (details.exams && details.exams.length > 0) {
          details.exams.forEach((e: any) => {
            examsHtml += `
              <li style="border-bottom: 1px dashed var(--border); padding-bottom: 12px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                  <strong style="color: var(--text-main); font-size: 14px;">✈️ ${e.foreign_course_name} [${e.foreign_course_code}] (${e.foreign_course_credits} CFU)</strong>
                </div>
                <div style="color: var(--text-muted); font-size: 13px;">
                  🏛️ ${e.unive_course_title} [${e.unive_course_code}] (${e.unive_course_credits} CFU)
                </div>
              </li>`;
          });
        } else {
          examsHtml +=
            '<li style="color: var(--text-muted); font-size: 13px;">Nessun esame inserito in bozza</li>';
        }
        examsHtml += '</ul>';

        const pendingDoc =
          details.documents && details.documents.length > 0
            ? details.documents[details.documents.length - 1]
            : null;

        this.reviewData = {
          appId: app.id,
          docType: 'DRAFT',
          studentName: `${app.student_first_name} ${app.student_last_name} (${app.matricola || 'N/A'})`,
          actionTypeKey: 'LECTURER.ACTION_INIT_LA',
          studentNote: null,
          docName: pendingDoc ? pendingDoc.file_name : null,
          docUrl: pendingDoc ? `http://localhost:3000${pendingDoc.file_path}` : null,
          examsHtml: examsHtml,
          isAcceptingDraft: true,
          datesText: null,
        };

        this.modalStep = 'read';
        this.motivoRifiuto = '';
        this.pendingAction = null;
        this.mostraModaleReview = true;
        this.cdr.detectChanges();
      })
      .catch((err) => console.error('Errore recupero dettagli bozza:', err));
  }

  startReview(app: any, docType: 'LEARNING_AGREEMENT' | 'TRANSCRIPT_OF_RECORDS') {
    const actionTypeKey =
      docType === 'LEARNING_AGREEMENT'
        ? app.status === 'AWAITING_MODIFICATION_APPROVAL'
          ? 'LECTURER.ACTION_MOD_LA'
          : 'LECTURER.ACTION_INIT_LA'
        : 'LECTURER.ACTION_TOR';

    fetch(`http://localhost:3000/api/applications/${app.id}`)
      .then((res) => res.json())
      .then((details) => {
        const pendingDoc = details.documents.find(
          (d: any) => d.document_type === docType && d.status === 'PENDING',
        );

        let examsHtml = '<ul style="list-style-type: none; padding: 0; margin: 0;">';
        const transVoto = this.translationService.translate('LECTURER.SCORE');

        if (docType === 'LEARNING_AGREEMENT') {
          const examsToShow = details.exams.filter(
            (e: any) => e.is_proposed_change || app.status === 'AWAITING_FOR_APPROVAL',
          );
          examsToShow.forEach((e: any) => {
            const isNewBadge = e.is_proposed_change ? `<span class="exam-new-tag">NEW</span>` : ``;

            examsHtml += `
              <li style="border-bottom: 1px dashed var(--border); padding-bottom: 12px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                  <strong style="color: var(--text-main); font-size: 14px;">✈️ ${e.foreign_course_name} [${e.foreign_course_code}] (${e.foreign_course_credits} CFU) ${isNewBadge}</strong>
                </div>
                <div style="color: var(--text-muted); font-size: 13px;">
                  🏛️ ${e.unive_course_title} [${e.unive_course_code}] (${e.unive_course_credits} CFU)
                </div>
              </li>`;
          });
        } else {
          details.exams.forEach((e: any) => {
            examsHtml += `
              <li style="border-bottom: 1px dashed var(--border); padding-bottom: 12px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <strong style="color: var(--text-main); font-size: 14px;">✈️ ${e.foreign_course_name} [${e.foreign_course_code}]</strong>
                  <span style="background: var(--surface); border: 1px solid var(--success); color: var(--success); padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 12px;">${transVoto}: ${e.score_obtained}</span>
                </div>
                <div style="color: var(--text-muted); font-size: 13px;">
                  🏛️ ${e.unive_course_title} [${e.unive_course_code}]
                </div>
              </li>`;
          });
        }
        examsHtml += '</ul>';

        // Estrazione e formattazione delle date
        const formatData = (dataStr: string) => {
          if (!dataStr) return '';
          return new Date(dataStr).toLocaleDateString('it-IT');
        };
        const datesText =
          details.actual_arrival_date && details.actual_departure_date
            ? `Dal ${formatData(details.actual_arrival_date)} al ${formatData(details.actual_departure_date)}`
            : null;

        this.reviewData = {
          appId: app.id,
          docType: docType,
          studentName: `${app.student_first_name} ${app.student_last_name} (${app.matricola || 'N/A'})`,
          actionTypeKey: actionTypeKey,
          studentNote: pendingDoc ? pendingDoc.modification_description : null,
          docName: pendingDoc ? pendingDoc.file_name : 'N/A',
          docUrl: pendingDoc ? `http://localhost:3000${pendingDoc.file_path}` : null,
          examsHtml: examsHtml,
          isAcceptingDraft: false,
          datesText: datesText,
        };

        this.modalStep = 'read';
        this.motivoRifiuto = '';
        this.pendingAction = null;
        this.mostraModaleReview = true;
        this.cdr.detectChanges();
      });
  }

  chiudiReviewModal() {
    this.mostraModaleReview = false;
    this.cdr.detectChanges();
  }

  impostaStep(step: 'read' | 'reject-reason' | 'confirm') {
    this.modalStep = step;
  }

  chiediConferma(action: 'approve' | 'reject') {
    this.pendingAction = action;
    this.modalStep = 'confirm';
  }

  eseguiAzione() {
    if (this.reviewData.isAcceptingDraft) {
      fetch(
        `http://localhost:3000/api/lecturer/applications/${this.reviewData.appId}/draft-review`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: this.pendingAction === 'approve' ? 'APPROVE' : 'REJECT',
            rejection_reason: this.pendingAction === 'reject' ? this.motivoRifiuto : null,
          }),
        },
      )
        .then((res) => {
          if (!res.ok) throw new Error('Errore server');
          this.modalStep = 'success';
          this.caricaPratiche();
          this.cdr.detectChanges();
        })
        .catch((err) => console.error(err));

      return;
    }

    fetch(`http://localhost:3000/api/lecturer/applications/${this.reviewData.appId}/review`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_type: this.reviewData.docType,
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

  chiudiSuccesso() {
    this.chiudiReviewModal();
  }

  openHistoricalDetails(app: any) {
    fetch(`http://localhost:3000/api/applications/${app.id}`)
      .then((res) => res.json())
      .then((details) => {
        this.historicalDetails = {
          ...details,
          student_first_name: app.student_first_name,
          student_last_name: app.student_last_name,
          matricola: app.matricola,
        };
        this.mostraModaleStorico = true;
        this.cdr.detectChanges();
      })
      .catch((err) => console.error('Errore recupero dettagli storici:', err));
  }

  chiudiModaleStorico() {
    this.mostraModaleStorico = false;
    this.historicalDetails = null;
    this.cdr.detectChanges();
  }
}
