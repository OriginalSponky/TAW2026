import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Fondamentale per i form

@Component({
  selector: 'app-new-request',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './new-request.component.html',
  styleUrls: ['./new-request.component.css'],
})
export class NewRequestComponent {
  @Input() utente: any;
  @Output() onBack = new EventEmitter<void>(); // Per tornare alla dashboard

  // Modello dati per gli esami dinamici
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

  inviaModulo(event: Event) {
    event.preventDefault();
    alert("Richiesta creata con successo! Stato: 'Awaiting Learning Agreement approval'");
    this.onBack.emit(); // Riporta l'utente alla dashboard dopo l'invio
  }
}
