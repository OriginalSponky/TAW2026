import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { translations } from '../i18n/translations';

@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  private currentLang = new BehaviorSubject<string>('it');
  currentLang$ = this.currentLang.asObservable();

  constructor() {
    const savedLang = localStorage.getItem('app_lang');
    if (savedLang) {
      this.currentLang.next(savedLang);
    }
  }

  setLanguage(lang: string) {
    this.currentLang.next(lang);
    localStorage.setItem('app_lang', lang);
  }

  getLanguage(): string {
    return this.currentLang.value;
  }

  toggleLanguage() {
    const nextLang = this.currentLang.value === 'it' ? 'en' : 'it';
    this.setLanguage(nextLang);
  }

  translate(key: string): string {
    if (!key) return '';
    const lang = this.currentLang.value;
    const keys = key.split('.');
    let value: any = translations[lang];

    for (const k of keys) {
      if (value && value[k]) {
        value = value[k];
      } else {
        return key; // Se manca nel dizionario, stampa il testo originale
      }
    }
    return value;
  }
}
