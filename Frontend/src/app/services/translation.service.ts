/* ==========================================================================
   TRANSLATION SERVICE - INTERNAZIONALIZZAZIONE (i18n)
   Gestisce lo stato della lingua attiva ('it' o 'en'), la persistenza
   su LocalStorage e la ricerca ricorsiva delle chiavi nei dizionari.
   ========================================================================== */

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { translations } from '../i18n/translations';

@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  // BehaviorSubject per mantenere lo stato reattivo della lingua corrente (default: 'it')
  private currentLang = new BehaviorSubject<string>('it');
  currentLang$ = this.currentLang.asObservable();

  constructor() {
    // Ripristina l'ultima lingua salvata dall'utente, se presente
    const savedLang = localStorage.getItem('app_lang');
    if (savedLang) {
      this.currentLang.next(savedLang);
    }
  }

  /**
   * Imposta una nuova lingua e la memorizza in locale.
   */
  setLanguage(lang: string) {
    this.currentLang.next(lang);
    localStorage.setItem('app_lang', lang);
  }

  getLanguage(): string {
    return this.currentLang.value;
  }

  /**
   * Inverte lo stato della lingua (da 'it' a 'en' e viceversa).
   */
  toggleLanguage() {
    const nextLang = this.currentLang.value === 'it' ? 'en' : 'it';
    this.setLanguage(nextLang);
  }

  /**
   * Cerca e traduce una chiave testuale (es. 'LOGIN.TITLE') nel dizionario corrispondente.
   * Se la chiave non viene trovata, restituisce la chiave stessa come fallback.
   */
  translate(key: string): string {
    if (!key) return '';
    const lang = this.currentLang.value;
    const keys = key.split('.');
    let value: any = translations[lang];

    for (const k of keys) {
      if (value && value[k]) {
        value = value[k];
      } else {
        return key; // Fallback: mostra la chiave grezza se manca nel dizionario
      }
    }
    return value;
  }
}
