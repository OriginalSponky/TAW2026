import { Component, ChangeDetectorRef } from '@angular/core'; // <-- 1. Importa ChangeDetectorRef
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
})
export class AppComponent {
  utenti: any[] = [];
  messaggioErrore: string = '';
  coloreTesto: string = 'green';

  // 2. Inietta il ChangeDetectorRef tramite il costruttore
  constructor(private cdr: ChangeDetectorRef) {}

  testServer() {
    fetch('http://localhost:3000/api/users')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Errore nella risposta del server');
        }
        return response.json();
      })
      .then((data) => {
        this.coloreTesto = 'green';
        this.messaggioErrore = '';
        this.utenti = data;

        // 3. Forza Angular ad aggiornare l'HTML istantaneamente!
        this.cdr.detectChanges();
      })
      .catch((error) => {
        this.coloreTesto = 'red';
        this.messaggioErrore = 'Errore di connessione al server o DB spento.';
        this.utenti = [];
        console.error(error);
      });
  }
}
