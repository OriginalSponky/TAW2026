import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-active-mobility',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './active-mobility.component.html',
  styleUrls: ['./active-mobility.component.css'],
})
export class ActiveMobilityComponent {
  @Input() utente: any;
  @Input() pratica: any;
  @Output() onBack = new EventEmitter<void>();
  @Output() onLogout = new EventEmitter<void>();

  menuAperto: boolean = false;
  pannelloAttivo: string = ''; // 'dates', 'la', or 'tor'

  showCancelModal: boolean = false;
  showSuccessModal: boolean = false;
  successMessage: string = '';

  get iniziali(): string {
    if (!this.utente) return '';
    return (this.utente.first_name.charAt(0) + this.utente.last_name.charAt(0)).toUpperCase();
  }

  // --- Header Navigation ---
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

  // --- Panels & Modals Logic ---
  togglePanel(panelName: string) {
    if (this.pannelloAttivo === panelName) {
      this.pannelloAttivo = '';
    } else {
      this.pannelloAttivo = panelName;
    }
  }

  openSuccessModal(message: string) {
    this.pannelloAttivo = '';
    this.successMessage = message;
    this.showSuccessModal = true;
  }

  closeModals() {
    this.showCancelModal = false;
    this.showSuccessModal = false;
  }

  executeCancel() {
    this.showCancelModal = false;
    this.openSuccessModal('Pratica annullata correttamente.');
  }

  startMobility() {
    this.openSuccessModal('Date salvate con successo! La tua mobilità è ufficialmente iniziata.');
  }
}
