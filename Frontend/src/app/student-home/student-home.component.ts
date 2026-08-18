import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NewRequestComponent } from '../new-request/new-request.component';

@Component({
  selector: 'app-student-home',
  standalone: true,
  imports: [CommonModule, NewRequestComponent],
  templateUrl: './student-home.component.html',
  styleUrls: ['./student-home.component.css'],
})
export class StudentHomeComponent {
  @Input() utente: any;
  @Output() onLogout = new EventEmitter<void>();

  menuAperto: boolean = false;
  vistaAttiva: string = 'dashboard';

  get iniziali(): string {
    if (!this.utente) return '';
    return (this.utente.first_name.charAt(0) + this.utente.last_name.charAt(0)).toUpperCase();
  }

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.menuAperto = !this.menuAperto;
  }

  @HostListener('document:click')
  chiudiMenu() {
    this.menuAperto = false;
  }

  logout(event: Event) {
    event.preventDefault();
    this.onLogout.emit();
  }

  apriNuovaRichiesta() {
    this.vistaAttiva = 'nuovaRichiesta';
  }

  tornaAllaDashboard() {
    this.vistaAttiva = 'dashboard';
  }

  mostraMessaggio(msg: string) {
    alert(msg);
  }
}
