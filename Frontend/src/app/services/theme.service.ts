import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private isDarkMode = false;
  private isBrowser = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    if (this.isBrowser) {
      this.loadTheme();
    }
  }

  // Carica il tema salvato o quello di sistema all'avvio
  private loadTheme() {
    const savedTheme = localStorage.getItem('app-theme');

    if (savedTheme === 'dark') {
      this.setDarkMode(true);
    } else if (savedTheme === 'light') {
      this.setDarkMode(false);
    } else {
      // Se non c'è nulla di salvato, legge le preferenze del sistema (es. se Windows/Mac è in dark mode)
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setDarkMode(prefersDark);
    }
  }

  // Imposta il tema
  private setDarkMode(isDark: boolean) {
    this.isDarkMode = isDark;

    if (this.isBrowser) {
      if (isDark) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('app-theme', 'dark');
      } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('app-theme', 'light');
      }
    }
  }

  // Alterna il tema (Da usare nel bottone)
  toggleTheme() {
    this.setDarkMode(!this.isDarkMode);
  }

  // Ritorna vero se la dark mode è attiva
  get isDark(): boolean {
    return this.isDarkMode;
  }
}
