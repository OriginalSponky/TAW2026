import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-staff-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './staff-dashboard.component.html',
  styleUrls: ['./staff-dashboard.component.css'],
})
export class StaffDashboardComponent implements OnInit {
  @Input() utente: any;
  @Output() onLogout = new EventEmitter<void>();

  menuAperto: boolean = false;
  activeView: 'homeView' | 'preDepartureView' | 'closureView' | 'allAppsView' = 'homeView';

  // ARRAY DATI DAL DB
  allApps: any[] = [];
  preDepartureApps: any[] = [];
  closureApps: any[] = [];
  praticheFiltrate: any[] = [];

  // ARRAY DINAMICI PER I FILTRI
  uniqueNazioni: string[] = [];
  uniqueIstituzioni: string[] = [];

  // FILTRI ARCHIVIO
  filtri = {
    studente: '',
    docente: '',
    stato: '',
    nazione: '',
    istituzione: '',
  };

  // MODALE REVIEW
  mostraModaleReview: boolean = false;
  modalStep: 'read' | 'reject-reason' | 'confirm' | 'success' = 'read';
  reviewData: any = {};
  pendingAction: 'approve' | 'reject' | null = null;
  motivoRifiuto: string = '';

  // MODALE DETTAGLI ARCHIVIO
  mostraModaleDettagli: boolean = false;
  appSelezionata: any = null;

  constructor(
    public themeService: ThemeService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.caricaPratiche();
  }

  get iniziali(): string {
    if (!this.utente) return 'ST';
    return (this.utente.first_name.charAt(0) + this.utente.last_name.charAt(0)).toUpperCase();
  }

  caricaPratiche() {
    fetch(`http://localhost:3000/api/staff/applications`)
      .then((res) => res.json())
      .then((data) => {
        this.allApps = data.map((a: any) => ({
          ...a,
          name: `${a.student_first_name} ${a.student_last_name}`,
          enumColor: this.getBadgeColor(a.status),
        }));

        // ESTRAE OPZIONI UNICHE PER I MENU A TENDINA DAI DATI DEL DB!
        this.uniqueNazioni = [...new Set(this.allApps.map((a) => a.country))]
          .filter(Boolean)
          .sort() as string[];
        this.uniqueIstituzioni = [...new Set(this.allApps.map((a) => a.institution))]
          .filter(Boolean)
          .sort() as string[];

        // Smista nelle code (solo pratiche attive)
        this.preDepartureApps = this.allApps.filter((a) => a.status === 'PRE_DEPARTURE_COMPLETED');
        this.closureApps = this.allApps.filter(
          (a) => a.status === 'WAITING_FOR_EXAM_SCORE_APPROVAL' && a.pending_docs === 0,
        );

        this.praticheFiltrate = [...this.allApps];
        this.cdr.detectChanges();
      })
      .catch((err) => console.error('Errore recupero archivio:', err));
  }

  getBadgeColor(status: string): string {
    switch (status) {
      case 'CREATED':
        return 'badge-neutral';
      case 'AWAITING_FOR_APPROVAL':
        return 'badge-warning';
      case 'PRE_DEPARTURE_COMPLETED':
        return 'badge-warning';
      case 'MOBILITY_IN_PROGRESS':
        return 'badge-info';
      case 'AWAITING_MODIFICATION_APPROVAL':
        return 'badge-warning';
      case 'WAITING_FOR_EXAM_SCORE_APPROVAL':
        return 'badge-purple';
      case 'CLOSED':
        return 'badge-success';
      case 'CANCELED':
        return 'badge-danger';
      default:
        return 'badge-neutral';
    }
  }

  // LOGICA FILTRI ARCHIVIO IN TEMPO REALE
  applicaFiltri() {
    this.praticheFiltrate = this.allApps.filter((app) => {
      const matchStudente =
        !this.filtri.studente ||
        app.name.toLowerCase().includes(this.filtri.studente.toLowerCase()) ||
        (app.matricola && app.matricola.includes(this.filtri.studente));
      const matchDocente =
        !this.filtri.docente ||
        app.teacher.toLowerCase().includes(this.filtri.docente.toLowerCase());
      const matchStato = !this.filtri.stato || app.status === this.filtri.stato;
      const matchNazione = !this.filtri.nazione || app.country === this.filtri.nazione;
      const matchIstituzione =
        !this.filtri.istituzione || app.institution === this.filtri.istituzione;

      return matchStudente && matchDocente && matchStato && matchNazione && matchIstituzione;
    });
    this.cdr.detectChanges();
  }

  resettaFiltri() {
    this.filtri = { studente: '', docente: '', stato: '', nazione: '', istituzione: '' };
    this.praticheFiltrate = [...this.allApps];
    this.cdr.detectChanges();
  }

  apriDettagli(id: number) {
    this.appSelezionata = this.allApps.find((a) => a.id === id);
    this.mostraModaleDettagli = true;
  }

  startReview(app: any, actionType: 'pre-departure' | 'closure', docName: string) {
    this.reviewData = {
      appId: app.id,
      studentName: `🧑‍🎓 Studente: ${app.name} (Mat. ${app.matricola})`,
      actionType: actionType,
      docName: docName,
    };

    this.modalStep = 'read';
    this.motivoRifiuto = '';
    this.pendingAction = null;
    this.mostraModaleReview = true;
    this.cdr.detectChanges();
  }

  impostaStep(step: 'read' | 'reject-reason' | 'confirm') {
    this.modalStep = step;
  }

  chiediConferma(action: 'approve' | 'reject') {
    this.pendingAction = action;
    this.modalStep = 'confirm';
  }

  eseguiAzione() {
    // CHIAMATA AL BACKEND CHE CAMBIA LO STATO
    fetch(`http://localhost:3000/api/staff/applications/${this.reviewData.appId}/review`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionType: this.reviewData.actionType,
        action: this.pendingAction === 'approve' ? 'APPROVE' : 'REJECT',
        rejection_reason: this.pendingAction === 'reject' ? this.motivoRifiuto : null,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Errore server');
        this.modalStep = 'success';
        this.caricaPratiche(); // Ricarica i dati per farla sparire dalla coda!
        this.cdr.detectChanges();
      })
      .catch((err) => console.error(err));
  }

  chiudiReviewModal() {
    this.mostraModaleReview = false;
    this.cdr.detectChanges();
  }

  chiudiSuccesso() {
    this.chiudiReviewModal();
    this.switchView('homeView');
  }

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.menuAperto = !this.menuAperto;
  }

  effettuaLogout(event: Event) {
    event.preventDefault();
    this.onLogout.emit();
  }

  switchView(view: 'homeView' | 'preDepartureView' | 'closureView' | 'allAppsView') {
    this.activeView = view;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.cdr.detectChanges();
  }
}
