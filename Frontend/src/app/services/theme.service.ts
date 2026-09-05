/* ==========================================================================
   THEME SERVICE - GESTIONE TEMI E COLORI DINAMICI
   Gestisce la Dark Mode (attivazione/disattivazione e persistenza)
   e la modifica dinamica delle variabili CSS globali per i colori del brand.
   ========================================================================== */

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  isDark = false;
  currentColor = 'blue';

  // Palette dei temi disponibili con relative varianti cromatiche
  private themes: any = {
    blue: {
      primary: '#2563eb',
      primaryHover: '#1d4ed8',
      primaryLight: '#eff6ff',
      primaryLightDark: 'rgba(37, 99, 235, 0.2)',
    },
    purple: {
      primary: '#9333ea',
      primaryHover: '#7e22ce',
      primaryLight: '#faf5ff',
      primaryLightDark: 'rgba(147, 51, 234, 0.2)',
    },
    emerald: {
      primary: '#10b981',
      primaryHover: '#059669',
      primaryLight: '#ecfdf5',
      primaryLightDark: 'rgba(16, 185, 129, 0.2)',
    },
    rose: {
      primary: '#e11d48',
      primaryHover: '#be123c',
      primaryLight: '#fff1f2',
      primaryLightDark: 'rgba(225, 29, 72, 0.2)',
    },
    yellow: {
      primary: '#eab308',
      primaryHover: '#d97706',
      primaryLight: '#fef9c3',
      primaryLightDark: 'rgba(234, 179, 8, 0.2)',
    },
  };

  constructor() {
    // 1. Ripristina lo stato della Dark Mode salvato
    const savedTheme = localStorage.getItem('app_theme');
    if (savedTheme === 'dark') {
      this.isDark = true;
      document.body.classList.add('dark-mode');
    }

    // 2. Ripristina il colore primario scelto dall'utente
    const savedColor = localStorage.getItem('app_color');
    if (savedColor && this.themes[savedColor]) {
      this.setThemeColor(savedColor);
    }
  }

  /**
   * Attiva o disattiva la modalità scura (Dark Mode).
   */
  toggleTheme() {
    this.isDark = !this.isDark;
    if (this.isDark) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('app_theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('app_theme', 'light');
    }
    this.applyCurrentColorLightDark(); // Aggiorna i contrasti dei sfondi chiari/scuri
  }

  /**
   * Cambia dinamicamente il colore primario dell'applicazione sovrascrivendo le variabili CSS root.
   */
  setThemeColor(colorName: string) {
    if (!this.themes[colorName]) return;

    this.currentColor = colorName;
    localStorage.setItem('app_color', colorName);

    const theme = this.themes[colorName];
    const root = document.documentElement; // Intercetta il tag HTML principale

    // Inietta i valori direttamente nelle Custom Properties del CSS globale
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--primary-hover', theme.primaryHover);

    this.applyCurrentColorLightDark();
  }

  /**
   * Configura la variante chiara o semitrasparenza del colore primario in base al tema attivo.
   */
  private applyCurrentColorLightDark() {
    const theme = this.themes[this.currentColor];
    const root = document.documentElement;

    if (this.isDark) {
      root.style.setProperty('--primary-light', theme.primaryLightDark);
    } else {
      root.style.setProperty('--primary-light', theme.primaryLight);
    }
  }
}
