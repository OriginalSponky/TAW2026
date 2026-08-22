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
  modificaCompletata: boolean = false;
  mostraErroreFile: boolean = false;

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

  // --- DOWNLOAD AND FILE VISUALIZZATION ---

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
            this.mostraErroreFile = true;
            this.mostraModale = true;
            this.cdr.detectChanges();
          }
        })
        .catch((error) => {
          this.mostraErroreFile = true;
          this.mostraModale = true;
          this.cdr.detectChanges();
        });
    } else {
      this.mostraErroreFile = true;
      this.mostraModale = true;
    }
  }

  // --- EDIT MODE LOGIC ---

  attivaModifica() {
    // Create a deep copy of the data so we can revert if cancelled
    this.dettagliBackup = JSON.parse(JSON.stringify(this.dettagli));
    this.isEditing = true;
  }

  annullaModifica() {
    // Restore the original data from backup
    this.dettagli = JSON.parse(JSON.stringify(this.dettagliBackup));
    this.isEditing = false;
  }

  richiediSalvataggio() {
    this.mostraModale = true;
  }

  chiudiModale() {
    this.mostraModale = false;
  }

  confermaSalvataggio() {
    if (this.isSubmitting) return; // Prevent double clicks
    this.isSubmitting = true;

    // Exam Mapping
    const payload = {
      institution_id: this.dettagli.institution_id,
      lecturer_id: this.dettagli.lecturer_id,
      academic_year: this.dettagli.academic_year,
      mobility_period: this.dettagli.mobility_period,
      exams: this.dettagli.exams.map((e: any) => ({
        foreignCode: e.foreign_course_code,
        foreignName: e.foreign_course_name,
        foreignCredits: e.foreign_course_credits,
        localCode: e.unive_course_code,
        localName: e.unive_course_title,
        localCredits: e.unive_course_credits,
      })),
    };

    fetch(`http://localhost:3000/api/applications/${this.requestId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Errore durante il salvataggio');
        return res.json();
      })
      .then((data) => {
        this.modificaCompletata = true;
      })
      .catch((err) => {
        alert(err.message);
        this.mostraModale = false;
      })
      .finally(() => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      });
  }

  chiudiSuccesso() {
    this.mostraModale = false;
    this.modificaCompletata = false;
    this.isEditing = false;

    this.dettagli = null;
    this.caricaDettagli();
  }

  // --- UTILS ---
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
}
