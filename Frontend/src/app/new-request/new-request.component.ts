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

  // Variabile per il file PDF
  fileSelezionato: File | null = null;
  erroreSalvataggio: string = '';

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
    console.log('--- 2. INIZIO VALIDAZIONE (validaEApriModale) ---');
    console.log('Dati base inseriti:', this.datiRichiesta);
    console.log('Esami inseriti:', this.esami);

    const isValidBasic = !!(
      this.datiRichiesta.academic_year &&
      this.datiRichiesta.mobility_period &&
      this.datiRichiesta.institution_id &&
      this.datiRichiesta.lecturer_id
    );
    console.log('Controllo dati base (tutti pieni?):', isValidBasic);

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
        console.log(`❌ ERRORE: L'esame n.${i + 1} ha dei campi vuoti!`, e);
        break;
      }
    }
    console.log('Controllo esami (tutti pieni?):', areExamsValid);

    if (!isValidBasic || !areExamsValid) {
      console.warn('⚠️ Validazione fallita: apro il modale rosso di errore.');
      this.showValidationErrors = true;
      this.showErrorModal = true;
      return;
    }

    console.log('✅ Validazione superata: apro il modale di conferma finale.');
    this.showValidationErrors = false;
    this.showErrorModal = false;
    this.mostraModale = true;
  }

  confermaInvio() {
    console.log('--- 3. INIZIO INVIO AL SERVER (confermaInvio) ---');
    if (this.isSubmitting) return;

    if (!this.fileSelezionato && !this.editRequestId) {
      console.error(
        "❌ ERRORE BLOCCANTE: Nessun file PDF salvato in memoria al momento dell'invio!",
      );
      alert('Devi caricare il Learning Agreement prima di inviare!');
      this.mostraModale = false;
      return;
    }

    this.isSubmitting = true;
    console.log('Costruzione del pacchetto dati (FormData)...');

    const formData = new FormData();
    formData.append('student_email', this.utente?.email || 'Nessuna email');
    formData.append('institution_id', this.datiRichiesta.institution_id);
    formData.append('lecturer_id', this.datiRichiesta.lecturer_id);
    formData.append('academic_year', this.datiRichiesta.academic_year);
    formData.append('mobility_period', this.datiRichiesta.mobility_period);
    formData.append('exams', JSON.stringify(this.esami));

    if (this.fileSelezionato) {
      formData.append('learning_agreement_file', this.fileSelezionato);
      console.log('Allegato al pacchetto il file:', this.fileSelezionato.name);
    }

    const url = this.editRequestId
      ? `http://localhost:3000/api/applications/${this.editRequestId}`
      : 'http://localhost:3000/api/applications';
    const method = this.editRequestId ? 'PUT' : 'POST';
    console.log(`🚀 Lancio richiesta HTTP -> Metodo: ${method} | Indirizzo: ${url}`);

    fetch(url, {
      method: method,
      body: formData,
    })
      .then(async (res) => {
        console.log('📩 Risposta arrivata dal server! Codice Status:', res.status);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data) => {
        console.log('✅ SUCCESSO! Il server ha risposto:', data);
        this.richiestaCompletata = true;
        this.cdr.detectChanges();
      })
      .catch((error) => {
        console.error('❌ ERRORE FATALE DI RETE O DAL SERVER:', error.message);
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

  // --- FUNZIONI PER I DOCUMENTI ---

  onFileSelected(event: any) {
    console.log('--- 1. EVENTO onFileSelected SCATTATO ---');
    console.log("File passati dall'input:", event.target.files);

    const file: File = event.target.files[0];
    if (file) {
      console.log(
        '📄 File rilevato -> Nome:',
        file.name,
        '| Tipo:',
        file.type,
        '| Peso:',
        file.size,
        'bytes',
      );
      if (file.type === 'application/pdf') {
        this.fileSelezionato = file;
        console.log('✅ File ACCETTATO e salvato in memoria.');
      } else {
        console.error('❌ ERRORE: Il file non è un PDF!');
        alert('Per favore, seleziona solo file PDF.');
        this.fileSelezionato = null;
      }
    } else {
      console.warn('⚠️ Nessun file selezionato (finestra chiusa senza scegliere nulla?).');
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
      } else {
        alert('Per favore, trascina solo file PDF.');
        this.fileSelezionato = null;
      }
    }
  }
}

