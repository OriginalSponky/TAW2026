import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
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
  @Output() onBack = new EventEmitter<void>();

  // Modello dei dati generali del form
  datiRichiesta = {
    academic_year: '',
    mobility_period: '',
    institution_id: '',
    lecturer_id: '',
  };

  // Liste dinamiche caricate dal database
  istituzioni: any[] = [];
  professori: any[] = [];
  erroreSalvataggio: string = '';

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

  get iniziali(): string {
    if (!this.utente) return '';
    return (this.utente.first_name.charAt(0) + this.utente.last_name.charAt(0)).toUpperCase();
  }

  ngOnInit() {
    // Appena si apre la pagina, scarichiamo le liste per i menù a tendina
    fetch('http://localhost:3000/api/institutions')
      .then((res) => res.json())
      .then((data) => (this.istituzioni = data));

    fetch('http://localhost:3000/api/lecturers')
      .then((res) => res.json())
      .then((data) => (this.professori = data));
  }

  tornaIndietro(event: Event) {
    event.preventDefault();
    this.onBack.emit();
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

  inviaModulo() {
    if (
      !this.datiRichiesta.academic_year ||
      !this.datiRichiesta.mobility_period ||
      !this.datiRichiesta.institution_id ||
      !this.datiRichiesta.lecturer_id
    ) {
      this.erroreSalvataggio = 'Attenzione: devi selezionare tutte le opzioni nel riquadro 1!';
      return;
    }

    this.erroreSalvataggio = '';

    const payload = {
      student_email: this.utente.email,
      institution_id: this.datiRichiesta.institution_id,
      lecturer_id: this.datiRichiesta.lecturer_id,
      academic_year: this.datiRichiesta.academic_year,
      mobility_period: this.datiRichiesta.mobility_period,
      exams: this.esami,
    };

    fetch('http://localhost:3000/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data) => {
        alert('Perfetto! ' + data.message);
        this.onBack.emit();
      })
      .catch((error) => {
        this.erroreSalvataggio = 'Si è verificato un errore: ' + error.message;
        console.error('ERRORE DI RETE:', error);
      });
  }
}
