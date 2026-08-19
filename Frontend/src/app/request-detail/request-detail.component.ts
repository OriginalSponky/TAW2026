import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-request-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './request-detail.component.html',
  styleUrls: ['./request-detail.component.css'],
})
export class RequestDetailComponent implements OnInit {
  @Input() requestId!: number; // Id from the previous page
  @Output() onBack = new EventEmitter<void>();

  dettagli: any = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    // Data download
    fetch(`http://localhost:3000/api/applications/${this.requestId}`)
      .then((res) => res.json())
      .then((data) => {
        this.dettagli = data;
        this.cdr.detectChanges();
      })
      .catch((err) => console.error('Errore fetch dettagli:', err));
  }
}
