import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RequestDetailComponent } from '../request-detail/request-detail.component';

// Servizi e i18n
import { ThemeService } from '../services/theme.service';
import { TranslationService } from '../services/translation.service';
import { TranslatePipe } from '../translate.pipe';

@Component({
  selector: 'app-my-requests',
  standalone: true,
  imports: [CommonModule, RequestDetailComponent, TranslatePipe],
  templateUrl: './my-requests.component.html',
  styleUrls: ['./my-requests.component.css'],
})
export class MyRequestsComponent implements OnInit {
  @Input() utente: any;
  @Output() onBack = new EventEmitter<void>();
  @Output() onNewRequest = new EventEmitter<void>();
  @Output() onLogout = new EventEmitter<void>();
  @Output() onEditRequest = new EventEmitter<number>();

  richieste: any[] = [];
  richiestaSelezionata: number | null = null;
  menuAperto: boolean = false;

  mostraAlert: boolean = false;
  alertType: 'success' | 'error' = 'success';
  alertMessage: string = '';

  confermaEliminazioneId: number | null = null;
  isDeleting: boolean = false;

  constructor(
    private cdr: ChangeDetectorRef,
    public themeService: ThemeService,
    public translationService: TranslationService,
  ) {}

  get iniziali(): string {
    if (!this.utente) return '';
    return (this.utente.first_name.charAt(0) + this.utente.last_name.charAt(0)).toUpperCase();
  }

  ngOnInit() {
    const emailSicura = encodeURIComponent(this.utente.email);
    fetch(`http://localhost:3000/api/applications?email=${emailSicura}`)
      .then((res) => {
        if (!res.ok) throw new Error('Errore dal server');
        return res.json();
      })
      .then((data) => {
        this.richieste = data;
        this.cdr.detectChanges();
      })
      .catch((err) => console.error('❌ Errore di lettura:', err));
  }

  mostraFeedback(tipo: 'success' | 'error', messaggio: string) {
    this.alertType = tipo;
    this.alertMessage = messaggio;
    this.mostraAlert = true;
    setTimeout(() => {
      this.chiudiFeedback();
    }, 4000);
  }

  chiudiFeedback() {
    this.mostraAlert = false;
  }

  tornaIndietro(event: Event) {
    event.preventDefault();
    this.onBack.emit();
  }

  vaiANuovaRichiesta(event: Event) {
    event.preventDefault();
    this.onNewRequest.emit();
  }

  formattaPeriodo(periodo: string): string {
    if (periodo === 'FIRST_SEMESTER')
      return this.translationService.translate('REQ_DETAIL.FIRST_SEM');
    if (periodo === 'SECOND_SEMESTER')
      return this.translationService.translate('REQ_DETAIL.SECOND_SEM');
    if (periodo === 'FULL_YEAR') return this.translationService.translate('REQ_DETAIL.FULL_YEAR');
    return periodo;
  }

  getClasseStato(stato: string): string {
    switch (stato) {
      case 'CREATED':
        return 'status-created';
      case 'AWAITING_FOR_APPROVAL':
        return 'status-awaiting-la';
      case 'PRE_DEPARTURE_COMPLETED':
        return 'status-pre-departure';
      case 'MOBILITY_IN_PROGRESS':
        return 'status-in-progress';
      case 'AWAITING_MODIFICATION_APPROVAL':
        return 'status-awaiting-modification';
      case 'WAITING_FOR_EXAM_SCORE_APPROVAL':
        return 'status-waiting-score';
      case 'EXAM_SCORES_APPROVED':
        return 'status-exam-approved'; // NUOVO COLORE CIANO
      case 'CLOSED':
        return 'status-closed';
      case 'CANCELED':
        return 'status-canceled';
      default:
        return 'status-closed';
    }
  }

  getTestoStato(stato: string): string {
    switch (stato) {
      case 'CREATED':
        return this.translationService.translate('MY_REQ.STATUS_CREATED');
      case 'AWAITING_FOR_APPROVAL':
        return this.translationService.translate('MY_REQ.STATUS_AW_LA');
      case 'PRE_DEPARTURE_COMPLETED':
        return this.translationService.translate('MY_REQ.STATUS_PRE_DEP');
      case 'MOBILITY_IN_PROGRESS':
        return this.translationService.translate('MY_REQ.STATUS_MOB_PROG');
      case 'AWAITING_MODIFICATION_APPROVAL':
        return this.translationService.translate('MY_REQ.STATUS_AW_MOD');
      case 'WAITING_FOR_EXAM_SCORE_APPROVAL':
        return this.translationService.translate('MY_REQ.STATUS_AW_SCORE');
      case 'EXAM_SCORES_APPROVED':
        return this.translationService.translate('MY_REQ.STATUS_EXAM_APP');
      case 'CLOSED':
        return this.translationService.translate('MY_REQ.STATUS_CLOSED');
      case 'CANCELED':
        return this.translationService.translate('MY_REQ.STATUS_CANCELED');
      default:
        return this.translationService.translate('MY_REQ.STATUS_UNKNOWN');
    }
  }

  apriDettaglio(id: number) {
    this.richiestaSelezionata = id;
  }

  chiudiDettaglio() {
    this.richiestaSelezionata = null;
  }

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.menuAperto = !this.menuAperto;
  }

  effettuaLogout(event: Event) {
    event.preventDefault();
    this.onLogout.emit();
  }

  modificaRichiesta(id: number) {
    this.onEditRequest.emit(id);
  }

  chiediConfermaEliminazione(id: number) {
    this.confermaEliminazioneId = id;
  }

  annullaEliminazione() {
    this.confermaEliminazioneId = null;
  }

  confermaEliminazioneDefinitiva(id: number) {
    if (this.isDeleting) return;
    this.isDeleting = true;

    fetch(`http://localhost:3000/api/applications/${id}`, { method: 'DELETE' })
      .then((res) => {
        if (!res.ok) throw new Error("Errore durante l'eliminazione");
        return res.json();
      })
      .then(() => {
        this.richieste = this.richieste.filter((r) => r.id !== id);
        this.mostraFeedback('success', this.translationService.translate('MY_REQ.SUCCESS_DEL'));
        this.confermaEliminazioneId = null;
        this.cdr.detectChanges();
      })
      .catch((err) => {
        this.mostraFeedback('error', this.translationService.translate('MY_REQ.ERR_DEL'));
        this.confermaEliminazioneId = null;
      })
      .finally(() => {
        this.isDeleting = false;
      });
  }
}
