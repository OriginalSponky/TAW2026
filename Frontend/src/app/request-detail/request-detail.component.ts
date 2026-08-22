import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-request-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './request-detail.component.html',
  styleUrls: ['./request-detail.component.css'],
})
export class RequestDetailComponent implements OnInit {
  @Input() requestId!: number;
  @Output() onBack = new EventEmitter<void>();

  dettagli: any = null;
  dettagliBackup: any = null;
  isEditing: boolean = false;
  mostraModale: boolean = false;
  isSubmitting: boolean = false;

  // --- VARIABILI PER IL TOAST GLOBALE ---
  mostraAlert: boolean = false;
  alertType: 'success' | 'error' = 'success';
  alertMessage: string = '';

  // --- VARIABILI PER IL DRAG & DROP ---
  isDragging: boolean = false;
  fileSelezionato: File | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

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

  getNomeDocumento(): string {
    if (!this.dettagli || !this.dettagli.documents) return 'Nessun file caricato';
    const doc = this.dettagli.documents.find((d: any) => d.document_type === 'LEARNING_AGREEMENT');
    return doc ? doc.file_name : 'Nessun file caricato';
  }

  scaricaDocumento(event: Event) {
    event.preventDefault();
    const doc = this.dettagli?.documents?.find(
      (d: any) => d.document_type === 'LEARNING_AGREEMENT',
    );

    if (doc && doc.file_path) {
      const url = 'http://localhost:3000' + doc.file_path;
      fetch(url, { method: 'HEAD' })
        .then((response) => {
          if (response.ok) {
            window.open(url, '_blank');
          } else {
            this.mostraFeedback('error', 'Il file non è disponibile sul server.');
            this.cdr.detectChanges();
          }
        })
        .catch(() => {
          this.mostraFeedback('error', 'Impossibile connettersi al server dei file.');
          this.cdr.detectChanges();
        });
    } else {
      this.mostraFeedback('error', 'Nessun percorso file associato.');
    }
  }

  // Intercetta la scelta del nuovo file PDF
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      if (file.type === 'application/pdf') {
        this.fileSelezionato = file;
        this.mostraFeedback('success', 'Nuovo file pronto: ' + file.name);
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

    // Usiamo FormData anziché JSON per permettere al backend di ricevere sia gli esami che il file PDF aggiornato
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

    if (this.fileSelezionato) {
      formData.append('learning_agreement_file', this.fileSelezionato);
    }

    fetch(`http://localhost:3000/api/applications/${this.requestId}`, {
      method: 'PUT',
      body: formData, // Invio tramite FormData corretto
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
        return 'First Semester';
      case 'SECOND_SEMESTER':
        return 'Second Semester';
      case 'FULL_YEAR':
        return 'Full Year';
      default:
        return periodo;
    }
  }

  formattaStato(status: string): string {
    if (!status) return '';
    return status.replace(/_/g, ' ');
  }

  // Funzioni Drag & Drop
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
        this.mostraFeedback('success', 'File ' + file.name + ' acquisito con successo!');
      } else {
        this.mostraFeedback('error', 'Per favore, trascina solo file in formato PDF.');
        this.fileSelezionato = null;
      }
    }
  }
}
