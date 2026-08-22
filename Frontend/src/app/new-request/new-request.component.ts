import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-new-request',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './new-request.component.html',
  styleUrls: ['./new-request.component.css'],
})
export class NewRequestComponent implements OnInit {
  @Input() utente: any;
  @Input() editRequestId: number | null = null;
  @Output() onBack = new EventEmitter<void>();
  @Output() onLogout = new EventEmitter<void>();
  @Output() onSuccess = new EventEmitter<void>();

  constructor(private cdr: ChangeDetectorRef) {}

  // Form data model
  datiRichiesta: any = {
    academic_year: '',
    mobility_period: '',
    institution_id: '',
    lecturer_id: '',
  };

  istituzioni: any[] = [];
  professori: any[] = [];

  // Dynamic exams array
  esami = [
    {
      foreignCode: '',
      foreignCredits: null,
      foreignName: '',
      localCode: '',
      localCredits: null,
      localName: '',
    },
  ];

  // UI State variables
  menuAperto: boolean = false;
  mostraModale: boolean = false;
  richiestaCompletata: boolean = false;
  isSubmitting: boolean = false;
  showValidationErrors: boolean = false;
  anniAccademici: string[] = ['2025/2026', '2026/2027', '2027/2028'];
  showErrorModal: boolean = false;
  isDragging: boolean = false;

  // File PDF e gestione Errori
  fileSelezionato: File | null = null;
  erroreSalvataggio: string = '';

  // --- VARIABILI PER IL TOAST GLOBALE ---
  mostraAlert: boolean = false;
  alertType: 'success' | 'error' = 'success';
  alertMessage: string = '';

  get iniziali(): string {
    if (!this.utente) return '';
    return (this.utente.first_name.charAt(0) + this.utente.last_name.charAt(0)).toUpperCase();
  }

  ngOnInit() {
    fetch('http://localhost:3000/api/institutions')
      .then((res) => res.json())
      .then((data) => (this.istituzioni = data));

    fetch('http://localhost:3000/api/lecturers')
      .then((res) => res.json())
      .then((data) => (this.professori = data));

    if (this.editRequestId) {
      fetch(`http://localhost:3000/api/applications/${this.editRequestId}`)
        .then((res) => res.json())
        .then((data) => {
          this.datiRichiesta = {
            academic_year: data.academic_year,
            mobility_period: data.mobility_period,
            institution_id: data.institution_id,
            lecturer_id: data.lecturer_id,
          };
          this.esami = data.exams.map((e: any) => ({
            foreignCode: e.foreign_course_code,
            foreignCredits: e.foreign_course_credits,
            foreignName: e.foreign_course_name,
            localCode: e.unive_course_code,
            localCredits: e.unive_course_credits,
            localName: e.unive_course_title,
          }));
        });
    }
  }

  // --- FUNZIONE PER GESTIRE IL TOAST ---
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
  }

  effettuaLogout(event: Event) {
    event.preventDefault();
    this.onLogout.emit();
  }

  aggiungiEsame() {
    this.esami.push({
      foreignCode: '',
      foreignCredits: null,
      foreignName: '',
      localCode: '',
      localCredits: null,
      localName: '',
    });
  }

  rimuoviEsame(indice: number) {
    this.esami.splice(indice, 1);
  }

  validaEApriModale() {
    const isValidBasic = !!(
      this.datiRichiesta.academic_year &&
      this.datiRichiesta.mobility_period &&
      this.datiRichiesta.institution_id &&
      this.datiRichiesta.lecturer_id
    );

    let areExamsValid = this.esami.length > 0;
    for (let i = 0; i < this.esami.length; i++) {
      const e = this.esami[i];
      if (
        !e.foreignCode ||
        !e.foreignName ||
        !e.foreignCredits ||
        !e.localCode ||
        !e.localName ||
        !e.localCredits
      ) {
        areExamsValid = false;
        break;
      }
    }

    if (!isValidBasic || !areExamsValid) {
      this.showValidationErrors = true;
      this.showErrorModal = true;
      return;
    }

    this.showValidationErrors = false;
    this.showErrorModal = false;
    this.mostraModale = true;
  }

  confermaInvio() {
    if (this.isSubmitting) return;

    if (!this.fileSelezionato && !this.editRequestId) {
      // SOSTITUITO ALERT NATIVO CON TOAST
      this.mostraFeedback('error', 'Devi caricare il Learning Agreement prima di inviare!');
      this.mostraModale = false;
      return;
    }

    this.isSubmitting = true;

    const formData = new FormData();
    formData.append('student_email', this.utente?.email || 'Nessuna email');
    formData.append('institution_id', this.datiRichiesta.institution_id);
    formData.append('lecturer_id', this.datiRichiesta.lecturer_id);
    formData.append('academic_year', this.datiRichiesta.academic_year);
    formData.append('mobility_period', this.datiRichiesta.mobility_period);
    formData.append('exams', JSON.stringify(this.esami));

    if (this.fileSelezionato) {
      formData.append('learning_agreement_file', this.fileSelezionato);
    }

    const url = this.editRequestId
      ? `http://localhost:3000/api/applications/${this.editRequestId}`
      : 'http://localhost:3000/api/applications';
    const method = this.editRequestId ? 'PUT' : 'POST';

    fetch(url, { method: method, body: formData })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data) => {
        this.richiestaCompletata = true;
        this.cdr.detectChanges();
      })
      .catch((error) => {
        this.mostraModale = false;
        this.erroreSalvataggio = 'Errore di connessione: ' + error.message;
        // SOSTITUITO LOG NATIVO CON TOAST
        this.mostraFeedback('error', "Errore durante l'invio della richiesta.");
        this.isSubmitting = false;
        this.cdr.detectChanges();
      });
  }

  chiudiModale() {
    this.mostraModale = false;
  }

  chiudiETornaAllaLista() {
    this.mostraModale = false;
    this.richiestaCompletata = false;
    this.isSubmitting = false;
    // Rimuoviamo il toast di successo qui, perché verrà gestito dalla home list in teoria
    this.onSuccess.emit();
  }

  // --- FUNZIONI PER I DOCUMENTI ---
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      if (file.type === 'application/pdf') {
        this.fileSelezionato = file;
        this.mostraFeedback('success', 'File ' + file.name + ' caricato con successo!');
      } else {
        // SOSTITUITO ALERT NATIVO CON TOAST
        this.mostraFeedback('error', 'Per favore, seleziona solo file in formato PDF.');
        this.fileSelezionato = null;
      }
    }
  }

  scaricaTemplate() {
    window.open('/templates/LEARNING_AGREEMENT_TEMPLATE.pdf', '_blank');
  }

  // --- FUNZIONI DRAG & DROP ---
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
        // SOSTITUITO ALERT NATIVO CON TOAST
        this.mostraFeedback('error', 'Per favore, trascina solo file in formato PDF.');
        this.fileSelezionato = null;
      }
    }
  }
}
