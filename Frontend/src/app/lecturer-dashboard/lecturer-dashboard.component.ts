import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-lecturer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  mostraModaleReview: boolean = false;
  modalStep: 'read' | 'reject-reason' | 'confirm' | 'success' = 'read';
  reviewData: any = {};
  pendingAction: 'approve' | 'reject' | null = null;
  motivoRifiuto: string = '';

  mostraModaleStorico: boolean = false;
  historicalDetails: any = null;

  constructor(
    public themeService: ThemeService,
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
        const praticheVisibili = data.filter((a: any) => a.status !== 'CREATED');

        this.pendingLAs = praticheVisibili.filter(
          (a: any) =>
            (a.status === 'AWAITING_FOR_APPROVAL' ||
              a.status === 'AWAITING_MODIFICATION_APPROVAL') &&
            a.pending_docs > 0,
        );
        this.pendingToRs = praticheVisibili.filter(
          (a: any) => a.status === 'WAITING_FOR_EXAM_SCORE_APPROVAL' && a.pending_docs > 0,
        );
        this.handledApps = praticheVisibili.filter((a: any) => {
          const isPendingLA =
            (a.status === 'AWAITING_FOR_APPROVAL' ||
              a.status === 'AWAITING_MODIFICATION_APPROVAL') &&
            a.pending_docs > 0;
          const isPendingToR = a.status === 'WAITING_FOR_EXAM_SCORE_APPROVAL' && a.pending_docs > 0;
          return !isPendingLA && !isPendingToR;
        });

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

  startReview(app: any, docType: 'LEARNING_AGREEMENT' | 'TRANSCRIPT_OF_RECORDS') {
    const actionType =
      docType === 'LEARNING_AGREEMENT'
        ? app.status === 'AWAITING_MODIFICATION_APPROVAL'
          ? 'Valutazione Modifica L.A.'
          : 'Valutazione L.A. Iniziale'
        : 'Valutazione Voti Rientro (ToR)';

    fetch(`http://localhost:3000/api/applications/${app.id}`)
      .then((res) => res.json())
      .then((details) => {
        const pendingDoc = details.documents.find(
          (d: any) => d.document_type === docType && d.status === 'PENDING',
        );

        let examsHtml = '';
        if (docType === 'LEARNING_AGREEMENT') {
          const examsToShow = details.exams.filter(
            (e: any) => e.is_proposed_change || app.status === 'AWAITING_FOR_APPROVAL',
          );
          examsToShow.forEach((e: any) => {
            examsHtml += `
              <div style="display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px dashed var(--border); margin-bottom: 8px;">
                <span>✈️ ${e.foreign_course_name} (${e.foreign_course_credits} CFU)</span>
                <span>🏛️ ${e.unive_course_title} (${e.unive_course_credits} CFU)</span>
              </div>`;
          });
        } else {
          details.exams.forEach((e: any) => {
            examsHtml += `
              <div style="display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px dashed var(--border); margin-bottom: 8px;">
                <span>✈️ ${e.foreign_course_name} <strong>(Voto: ${e.score_obtained})</strong></span>
                <span>🏛️ ${e.unive_course_title}</span>
              </div>`;
          });
        }

        this.reviewData = {
          appId: app.id,
          docType: docType,
          studentName: `🧑‍🎓 Studente: ${app.student_first_name} ${app.student_last_name}`,
          actionType: actionType,
          studentNote: pendingDoc ? pendingDoc.modification_description : null,
          docName: pendingDoc ? pendingDoc.file_name : 'Documento non trovato',
          docUrl: pendingDoc ? `http://localhost:3000${pendingDoc.file_path}` : '#',
          examsHtml: examsHtml,
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
        if (!res.ok) throw new Error("Errore durante l'azione server");
        this.modalStep = 'success';
        this.caricaPratiche();
        this.cdr.detectChanges();
      })
      .catch((err) => console.error(err));
  }

  chiudiSuccesso() {
    this.chiudiReviewModal();
    this.switchView('homeView');
  }

  // LOGICA MODALE STORICO AGGIORNATA
  openHistoricalDetails(app: any) {
    fetch(`http://localhost:3000/api/applications/${app.id}`)
      .then((res) => res.json())
      .then((details) => {
        this.historicalDetails = {
          ...details,
          student_first_name: app.student_first_name,
          student_last_name: app.student_last_name,
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

  formattaStato(status: string): string {
    return status.replace(/_/g, ' ');
  }
}
