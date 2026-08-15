import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
})
export class AppComponent {
  progetti: any[] = [];
  messaggioErrore: string = '';
  coloreTesto: string = 'green';

  testServer() {
    // Interroga il backend Express
    fetch('http://localhost:3000/api/projects')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Errore nella risposta del server');
        }
        return response.json();
      })
      .then((data) => {
        this.coloreTesto = 'green';
        this.messaggioErrore = '';
        this.progetti = data;
      })
      .catch((error) => {
        this.coloreTesto = 'red';
        this.messaggioErrore = 'Errore di connessione al server o DB spento.';
        this.progetti = [];
        console.error(error);
      });
  }
}
