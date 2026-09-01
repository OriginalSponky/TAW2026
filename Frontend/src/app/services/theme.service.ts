import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  isDark = false;
  currentColor = 'blue';

  // Definiamo i nostri 4 colori primari
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
  };

  constructor() {
    // 1. Ripristina Dark Mode
    const savedTheme = localStorage.getItem('app_theme');
    if (savedTheme === 'dark') {
      this.isDark = true;
      document.body.classList.add('dark-mode');
    }

    // 2. Ripristina Colore Scelto
    const savedColor = localStorage.getItem('app_color');
    if (savedColor && this.themes[savedColor]) {
      this.setThemeColor(savedColor);
    }
  }

  toggleTheme() {
    this.isDark = !this.isDark;
    if (this.isDark) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('app_theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('app_theme', 'light');
    }
    this.applyCurrentColorLightDark(); // Aggiorna i contrasti se cambia il tema
  }

  // NUOVO: Funzione per cambiare il colore primario ovunque
  setThemeColor(colorName: string) {
    if (!this.themes[colorName]) return;

    this.currentColor = colorName;
    localStorage.setItem('app_color', colorName);

    const theme = this.themes[colorName];
    const root = document.documentElement; // Intercetta il tag <html> base

    // Sovrascrive le variabili CSS globali
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--primary-hover', theme.primaryHover);

    this.applyCurrentColorLightDark();
  }

  private applyCurrentColorLightDark() {
    const theme = this.themes[this.currentColor];
    const root = document.documentElement;

    // Assicura che i background semitrasparenti siano corretti in base a dark/light mode
    if (this.isDark) {
      root.style.setProperty('--primary-light', theme.primaryLightDark);
    } else {
      root.style.setProperty('--primary-light', theme.primaryLight);
    }
  }
}
