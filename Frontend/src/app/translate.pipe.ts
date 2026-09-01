import { Pipe, PipeTransform } from '@angular/core';
import { TranslationService } from './services/translation.service';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false, // "false" permette al testo di aggiornarsi immediatamente al click
})
export class TranslatePipe implements PipeTransform {
  constructor(private translationService: TranslationService) {}

  transform(value: string): string {
    return this.translationService.translate(value);
  }
}
