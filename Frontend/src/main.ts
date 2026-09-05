/* ==========================================================================
   MAIN.TS - ENTRY POINT DELL'APPLICAZIONE
   Questo file si occupa di inizializzare (bootstrap) l'applicazione Angular
   nella sua forma "Standalone" (senza i vecchi moduli app.module.ts).
   ========================================================================== */

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Avvia l'applicazione passando il componente radice (AppComponent)
// e il file di configurazione globale (che contiene router, client HTTP e provider)
bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error('Errore critico in fase di avvio:', err),
);
