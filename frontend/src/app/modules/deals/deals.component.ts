import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { finalize } from 'rxjs';
import { CustomersService } from '../../core/services/customers.service';
import { DealsService } from '../../core/services/deals.service';
import { Customer, Deal } from '../../shared/models/crm.models';

const STAGE_COLORS: Record<string, string> = {
  QUALIFICATION: '#dbeafe',
  PROPOSAL: '#fef9c3',
  NEGOTIATION: '#fed7aa',
  WON: '#dcfce7',
  LOST: '#fee2e2'
};
const STAGE_TEXT: Record<string, string> = {
  QUALIFICATION: '#1d4ed8',
  PROPOSAL: '#a16207',
  NEGOTIATION: '#c2410c',
  WON: '#15803d',
  LOST: '#b91c1c'
};

@Component({
  selector: 'crm-deals',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatTableModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  styles: [`
    .page-layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 20px;
      align-items: start;
    }
    @media (max-width: 768px) {
      .page-layout { grid-template-columns: 1fr; }
    }
    .panel {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    .panel-header {
      padding: 16px 20px 12px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .panel-title { font-size: 15px; font-weight: 600; color: #1e293b; }
    .panel-header mat-icon { color: #64748b; }
    .panel-body { padding: 16px 20px 20px; }
    .form-grid { display: grid; gap: 4px; }
    .full-width { width: 100%; }
    table.mat-mdc-table { width: 100%; }
    .empty-state {
      text-align: center;
      padding: 48px 16px;
      color: #94a3b8;
    }
    .empty-state mat-icon {
      font-size: 40px; width: 40px; height: 40px;
      margin: 0 auto 8px; display: block;
    }
    .empty-state p { margin: 0; font-size: 13px; }
    .stage-badge {
      display: inline-block;
      border-radius: 4px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .row-count { font-size: 12px; color: #94a3b8; padding: 0 20px 12px; }
  `],
  template: `
    <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #0f172a">Deals</h2>

    <div class="page-layout">

      <!-- ── Create Form ─────────────────────────────────────────── -->
      <div class="panel">
        <div class="panel-header">
          <mat-icon>add_circle_outline</mat-icon>
          <span class="panel-title">New Deal</span>
        </div>
        <div class="panel-body">
          <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Deal title</mat-label>
              <input matInput formControlName="title" autocomplete="off" />
              @if (form.get('title')?.hasError('required') && form.get('title')?.touched) {
              <mat-error>Title is required</mat-error>
            }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Value ($)</mat-label>
              <mat-icon matPrefix style="color:#94a3b8;margin-right:4px">attach_money</mat-icon>
              <input matInput type="number" formControlName="value" min="0" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Stage</mat-label>
              <mat-select formControlName="stage">
                <mat-option value="QUALIFICATION">Qualification</mat-option>
                <mat-option value="PROPOSAL">Proposal</mat-option>
                <mat-option value="NEGOTIATION">Negotiation</mat-option>
                <mat-option value="WON">Won</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Customer</mat-label>
              <mat-select formControlName="customerId">
                @for (c of customers; track c.id) {
                  <mat-option [value]="c.id">{{ c.name }}</mat-option>
                }
              </mat-select>
              @if (form.get('customerId')?.hasError('min') && form.get('customerId')?.touched) {
                <mat-error>Select a customer</mat-error>
              }
            </mat-form-field>

            <button
              mat-flat-button
              color="primary"
              type="submit"
              [disabled]="form.invalid || saving"
              style="height: 44px; margin-top: 4px"
            >
              @if (saving) {
                <mat-spinner diameter="18" style="display:inline-block;margin-right:8px;vertical-align:middle" />
              }
              {{ saving ? 'Saving…' : 'Save Deal' }}
            </button>

          </form>
        </div>
      </div>

      <!-- ── Deals Table ─────────────────────────────────────────── -->
      <div class="panel">
        <div class="panel-header">
          <mat-icon>handshake</mat-icon>
          <span class="panel-title">All Deals</span>
        </div>

        @if (loading) {
          <div style="display:flex;justify-content:center;padding:48px"><mat-spinner diameter="36" /></div>
        } @else if (deals.length === 0) {
          <div class="empty-state">
            <mat-icon>handshake</mat-icon>
            <p>No deals yet.<br>Use the form to add the first one.</p>
          </div>
        } @else {
          <div class="row-count">{{ deals.length }} deal{{ deals.length !== 1 ? 's' : '' }}</div>
          <table mat-table [dataSource]="deals">
            <ng-container matColumnDef="title">
              <th mat-header-cell *matHeaderCellDef>Title</th>
              <td mat-cell *matCellDef="let item">{{ item.title }}</td>
            </ng-container>
            <ng-container matColumnDef="customer">
              <th mat-header-cell *matHeaderCellDef>Customer</th>
              <td mat-cell *matCellDef="let item">{{ item.customer?.name || '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="value">
              <th mat-header-cell *matHeaderCellDef>Value</th>
              <td mat-cell *matCellDef="let item">{{ item.value | currency }}</td>
            </ng-container>
            <ng-container matColumnDef="stage">
              <th mat-header-cell *matHeaderCellDef>Stage</th>
              <td mat-cell *matCellDef="let item">
                <span
                  class="stage-badge"
                  [style.background]="stageColor(item.stage)"
                  [style.color]="stageText(item.stage)"
                >
                  {{ item.stage }}
                </span>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
          </table>
        }
      </div>

    </div>
  `
})
export class DealsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dealsService = inject(DealsService);
  private readonly customersService = inject(CustomersService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cd = inject(ChangeDetectorRef);

  protected deals: Deal[] = [];
  protected customers: Customer[] = [];
  protected loading = true;
  protected saving = false;
  protected readonly columns = ['title', 'customer', 'value', 'stage'];

  protected readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    value: [0, Validators.min(0)],
    stage: ['QUALIFICATION', Validators.required],
    customerId: [0, Validators.min(1)]
  });

  ngOnInit(): void {
    this.loadCustomers();
    this.loadDeals();
  }

  submit(): void {
    if (this.form.invalid || this.saving) return;
    this.saving = true;
    this.cd.markForCheck();
    this.dealsService
      .create(this.form.getRawValue())
      .pipe(finalize(() => { this.saving = false; this.cd.markForCheck(); }))
      .subscribe({
        next: () => {
          this.form.patchValue({ title: '', value: 0, stage: 'QUALIFICATION' });
          this.snackBar.open('Deal saved successfully', 'Close', { duration: 3000 });
          this.loadDeals();
        },
        error: (err: HttpErrorResponse) => {
          const msg = (err?.error?.message as string | undefined) ?? 'Failed to save deal';
          this.snackBar.open(msg, 'Close', { duration: 5000 });
        }
      });
  }

  protected stageColor(stage: string): string {
    return STAGE_COLORS[stage] ?? '#f1f5f9';
  }

  protected stageText(stage: string): string {
    return STAGE_TEXT[stage] ?? '#475569';
  }

  private loadDeals(): void {
    this.loading = true;
    this.cd.markForCheck();
    this.dealsService
      .list()
      .pipe(finalize(() => { this.loading = false; this.cd.markForCheck(); }))
      .subscribe({
        next: deals => {
          this.deals = deals;
          this.cd.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          const msg = (err?.error?.message as string | undefined) ?? 'Failed to load deals';
          this.snackBar.open(msg, 'Close', { duration: 5000 });
        }
      });
  }

  private loadCustomers(): void {
    this.customersService.list().subscribe({
      next: customers => {
        this.customers = customers;
        const [first] = customers;
        if (first && !this.form.value.customerId) {
          this.form.patchValue({ customerId: first.id });
        }
        this.cd.markForCheck();
      },
      error: () => {}
    });
  }
}
