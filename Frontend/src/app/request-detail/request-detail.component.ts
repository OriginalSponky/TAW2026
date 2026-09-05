import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// i18n
import { TranslatePipe } from '../translate.pipe';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-request-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './request-detail.component.html',
  styleUrls: ['./request-detail.component.css'],
})
export class RequestDetailComponent implements OnInit {
  @Input() requestId!: number;
  @Input() utente: any;
  @Output() onBack = new EventEmitter<void>();

  dettagli: any = null;
  dettagliBackup: any = null;
  isEditing: boolean = false;
  mostraModale: boolean = false;
  isSubmitting: boolean = false;

  mostraAlert: boolean = false;
  alertType: 'success' | 'error' = 'success';
  alertMessage: string = '';

  isDragging: boolean = false;
  fileSelezionato: File | null = null;

  constructor(
    private cdr: ChangeDetectorRef,
    public translationService: TranslationService,
  ) {}

  ngOnInit() {
    this.caricaDettagli();
  }

  caricaDettagli() {
    fetch(`http://localhost:3000/api/applications/${this.requestId}`)
      .then((res) => res.json())
      .then((data) => {
        this.dettagli = data;
        this.cdr.detectChanges();
      })
      .catch((err) => console.error('Errore fetch dettagli:', err));
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

  // AGGIORNATO: Ora accetta il tipo di documento in ingresso!
  getNomeDocumento(tipo: string = 'LEARNING_AGREEMENT'): string {
    if (!this.dettagli || !this.dettagli.documents)
      return this.translationService.translate('REQ_DETAIL.NOT_ENTERED');

    const doc =
      this.dettagli.documents.find(
        (d: any) => d.document_type === tipo && d.status === 'APPROVED',
      ) || this.dettagli.documents.find((d: any) => d.document_type === tipo);

    return doc ? doc.file_name : this.translationService.translate('REQ_DETAIL.NOT_ENTERED');
  }

  // AGGIORNATO: Ora accetta il tipo di documento per il download!
  scaricaDocumento(event: Event, tipo: string = 'LEARNING_AGREEMENT') {
    event.preventDefault();
    const doc =
      this.dettagli?.documents?.find(
        (d: any) => d.document_type === tipo && d.status === 'APPROVED',
      ) || this.dettagli?.documents?.find((d: any) => d.document_type === tipo);

    if (doc && doc.file_path) {
      const url = 'http://localhost:3000' + doc.file_path;
      fetch(url, { method: 'HEAD' })
        .then((response) => {
          if (response.ok) window.open(url, '_blank');
          else this.mostraFeedback('error', 'Il file non è disponibile sul server.');
        })
        .catch(() => this.mostraFeedback('error', 'Impossibile connettersi al server dei file.'));
    } else {
      this.mostraFeedback('error', 'Nessun percorso file associato.');
    }
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      if (file.type === 'application/pdf') {
        this.fileSelezionato = file;
        this.mostraFeedback('success', 'File ' + file.name + ' pronto!');
      } else {
        this.mostraFeedback('error', 'Seleziona un file in formato PDF.');
        this.fileSelezionato = null;
      }
    }
  }

  attivaModifica() {
    this.dettagliBackup = JSON.parse(JSON.stringify(this.dettagli));
    this.fileSelezionato = null;
    this.isEditing = true;
  }

  annullaModifica() {
    this.dettagli = JSON.parse(JSON.stringify(this.dettagliBackup));
    this.fileSelezionato = null;
    this.isEditing = false;
  }

  richiediSalvataggio() {
    this.mostraModale = true;
  }
  chiudiModale() {
    this.mostraModale = false;
  }

  confermaSalvataggio() {
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    const formData = new FormData();
    formData.append('institution_id', this.dettagli.institution_id);
    formData.append('lecturer_id', this.dettagli.lecturer_id);
    formData.append('academic_year', this.dettagli.academic_year);
    formData.append('mobility_period', this.dettagli.mobility_period);

    const examsPayload = this.dettagli.exams.map((e: any) => ({
      foreignCode: e.foreign_course_code,
      foreignName: e.foreign_course_name,
      foreignCredits: e.foreign_course_credits,
      localCode: e.unive_course_code,
      localName: e.unive_course_title,
      localCredits: e.unive_course_credits,
    }));

    formData.append('exams', JSON.stringify(examsPayload));
    if (this.fileSelezionato) formData.append('learning_agreement_file', this.fileSelezionato);

    fetch(`http://localhost:3000/api/applications/${this.requestId}`, {
      method: 'PUT',
      body: formData,
    })
      .then((res) => {
        if (!res.ok) throw new Error('Errore durante il salvataggio');
        return res.json();
      })
      .then(() => {
        this.mostraModale = false;
        this.isEditing = false;
        this.fileSelezionato = null;
        this.mostraFeedback('success', 'Modifiche salvate con successo!');
        this.caricaDettagli();
      })
      .catch((err) => {
        this.mostraModale = false;
        this.mostraFeedback('error', err.message || 'Errore di connessione.');
      })
      .finally(() => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      });
  }

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

  formattaStato(status: string): string {
    if (!status) return '';
    switch (status) {
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
        return this.translationService.translate('MY_REQ.STATUS_EXAM_APP'); // NUOVO STATO!
      case 'CLOSED':
        return this.translationService.translate('MY_REQ.STATUS_CLOSED');
      case 'CANCELED':
        return this.translationService.translate('MY_REQ.STATUS_CANCELED');
      default:
        return this.translationService.translate('MY_REQ.STATUS_UNKNOWN');
    }
  }

  tornaIndietro(event: Event) {
    event.preventDefault();
    this.onBack.emit();
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }
  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        this.fileSelezionato = file;
        this.mostraFeedback('success', 'File acquisito con successo!');
      } else {
        this.mostraFeedback('error', 'Per favore, trascina solo file in formato PDF.');
        this.fileSelezionato = null;
      }
    }
  }
}
