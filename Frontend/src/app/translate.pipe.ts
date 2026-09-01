import { Pipe, PipeTransform, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { TranslationService } from './services/translation.service';
import { Subscription } from 'rxjs';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false, // Fondamentale per l'aggiornamento dinamico
})
export class TranslatePipe implements PipeTransform, OnDestroy {
  private sub: Subscription;

  constructor(
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef,
  ) {
    // Quando la lingua cambia, "svegliamo" Angular e forziamo l'aggiornamento della vista!
    this.sub = this.translationService.currentLang$.subscribe(() => {
      this.cdr.markForCheck();
    });
  }

  transform(key: string): string {
    return this.translationService.translate(key);
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
  }
}
