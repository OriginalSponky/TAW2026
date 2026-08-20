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
  erroreSalvataggio: string = '';

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

  get iniziali(): string {
    if (!this.utente) return '';
    return (this.utente.first_name.charAt(0) + this.utente.last_name.charAt(0)).toUpperCase();
  }

  ngOnInit() {
    // Fetch dropdown data
    fetch('http://localhost:3000/api/institutions')
      .then((res) => res.json())
      .then((data) => (this.istituzioni = data));
    fetch('http://localhost:3000/api/lecturers')
      .then((res) => res.json())
      .then((data) => (this.professori = data));

    // If we are in Edit Mode, fetch the existing application data!
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

          // Map database columns back to frontend variables
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

  // --- Header Navigation & Profile Actions ---

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
    this.onLogout.emit(); // Bubble up the logout request to the parent
  }

  // --- Dynamic Exam Form ---

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

  // --- Submission & Modal Logic ---

  validaEApriModale() {
    // Check basic details
    const isValidBasic =
      this.datiRichiesta.academic_year &&
      this.datiRichiesta.mobility_period &&
      this.datiRichiesta.institution_id &&
      this.datiRichiesta.lecturer_id;

    //Check exams
    let areExamsValid = this.esami.length > 0;
    for (const e of this.esami) {
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

    // Validation result
    if (!isValidBasic || !areExamsValid) {
      this.showValidationErrors = true;
      this.showErrorModal = true;
      return;
    }

    // Valid, send request
    this.showValidationErrors = false;
    this.showErrorModal = false;
    this.mostraModale = true;
  }

  confermaInvio() {
    //Prevent double clicks
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    const payload = {
      student_email: this.utente.email,
      institution_id: this.datiRichiesta.institution_id,
      lecturer_id: this.datiRichiesta.lecturer_id,
      academic_year: this.datiRichiesta.academic_year,
      mobility_period: this.datiRichiesta.mobility_period,
      exams: this.esami,
    };

    const url = this.editRequestId
      ? `http://localhost:3000/api/applications/${this.editRequestId}`
      : 'http://localhost:3000/api/applications';

    const method = this.editRequestId ? 'PUT' : 'POST';

    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
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
    this.onSuccess.emit();
  }
}
