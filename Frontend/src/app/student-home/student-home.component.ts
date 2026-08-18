import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-student-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-home.component.html',
  styleUrls: ['./student-home.component.css'],
})
export class StudentHomeComponent {
  // Riceve l'utente loggato dal componente padre
  @Input() utente: any;
  // Invia un segnale al componente padre per fare il logout
  @Output() onLogout = new EventEmitter<void>();

  menuAperto: boolean = false;

  // Calcola dinamicamente le iniziali
  get iniziali(): string {
    if (!this.utente) return '';
    return (this.utente.first_name.charAt(0) + this.utente.last_name.charAt(0)).toUpperCase();
  }

  // Apre o chiude la tendina
  toggleMenu(event: Event) {
    event.stopPropagation();
    this.menuAperto = !this.menuAperto;
  }

  // Se clicchi fuori dalla tendina, la chiude
  chiudiMenu() {
    this.menuAperto = false;
  }

  logout(event: Event) {
    event.preventDefault(); // Evita che la pagina scatti verso l'alto
    this.onLogout.emit(); // Lancia il segnale di logout
  }

  mostraMessaggio(msg: string) {
    alert(msg);
  }
}
