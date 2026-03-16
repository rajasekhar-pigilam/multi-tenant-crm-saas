import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ActivitiesService } from '../../core/services/activities.service';
import { CustomersService } from '../../core/services/customers.service';
import { Activity, Customer } from '../../shared/models/crm.models';

const TYPE_CONFIG: Record<string, { bg: string; color: string; icon: string }> = {
  CALL:    { bg: '#dbeafe', color: '#1d4ed8', icon: 'call'          },
  EMAIL:   { bg: '#dcfce7', color: '#15803d', icon: 'email'         },
  MEETING: { bg: '#fef9c3', color: '#a16207', icon: 'groups'        }
};

@Component({
  selector: 'crm-activities',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
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
    .type-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border-radius: 4px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .type-badge mat-icon {
      font-size: 12px;
      width: 12px;
      height: 12px;
    }
    .row-count { font-size: 12px; color: #94a3b8; padding: 0 20px 12px; }
  `],
  template: `
    <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #0f172a">Activities</h2>

    <div class="page-layout">

      <!-- ── Create Form ─────────────────────────────────────────── -->
      <div class="panel">
        <div class="panel-header">
          <mat-icon>add_circle_outline</mat-icon>
          <span class="panel-title">Log Activity</span>
        </div>
        <div class="panel-body">
          <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Activity type</mat-label>
              <mat-select formControlName="type">
                <mat-option value="CALL">
                  <mat-icon style="vertical-align:middle;margin-right:6px;font-size:16px">call</mat-icon>
                  Call
                </mat-option>
                <mat-option value="EMAIL">
                  <mat-icon style="vertical-align:middle;margin-right:6px;font-size:16px">email</mat-icon>
                  Email
                </mat-option>
                <mat-option value="MEETING">
                  <mat-icon style="vertical-align:middle;margin-right:6px;font-size:16px">groups</mat-icon>
                  Meeting
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Customer</mat-label>
              <mat-select formControlName="customerId">
                <mat-option *ngFor="let c of customers" [value]="c.id">
                  {{ c.name }}
                </mat-option>
              </mat-select>
              <mat-error *ngIf="form.get('customerId')?.hasError('min')">Select a customer</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Notes</mat-label>
              <textarea matInput rows="4" formControlName="notes" placeholder="Optional notes…"></textarea>
            </mat-form-field>

            <button
              mat-flat-button
              color="primary"
              type="submit"
              [disabled]="form.invalid || saving"
              style="height: 44px; margin-top: 4px"
            >
              <mat-spinner *ngIf="saving" diameter="18" style="display:inline-block;margin-right:8px;vertical-align:middle" />
              {{ saving ? 'Saving…' : 'Log Activity' }}
            </button>

          </form>
        </div>
      </div>

      <!-- ── Activities Table ────────────────────────────────────── -->
      <div class="panel">
        <div class="panel-header">
          <mat-icon>event_note</mat-icon>
          <span class="panel-title">Activity Log</span>
        </div>

        <div *ngIf="loading" style="display:flex;justify-content:center;padding:48px">
          <mat-spinner diameter="36" />
        </div>

        <div *ngIf="!loading && activities.length === 0" class="empty-state">
          <mat-icon>event_note</mat-icon>
          <p>No activities yet.<br>Log the first one using the form.</p>
        </div>

        <ng-container *ngIf="!loading && activities.length > 0">
          <div class="row-count">{{ activities.length }} activit{{ activities.length !== 1 ? 'ies' : 'y' }}</div>
          <table mat-table [dataSource]="activities">
            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef>Type</th>
              <td mat-cell *matCellDef="let item">
                <span
                  class="type-badge"
                  [style.background]="typeConfig(item.type).bg"
                  [style.color]="typeConfig(item.type).color"
                >
                  <mat-icon>{{ typeConfig(item.type).icon }}</mat-icon>
                  {{ item.type }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="customer">
              <th mat-header-cell *matHeaderCellDef>Customer</th>
              <td mat-cell *matCellDef="let item">{{ item.customer?.name || '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="notes">
              <th mat-header-cell *matHeaderCellDef>Notes</th>
              <td mat-cell *matCellDef="let item" style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                {{ item.notes || '—' }}
              </td>
            </ng-container>
            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>When</th>
              <td mat-cell *matCellDef="let item">{{ item.createdAt | date: 'MMM d, h:mm a' }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
          </table>
        </ng-container>
      </div>

    </div>
  `
})
export class ActivitiesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly activitiesService = inject(ActivitiesService);
  private readonly customersService = inject(CustomersService);
  private readonly snackBar = inject(MatSnackBar);

  protected activities: Activity[] = [];
  protected customers: Customer[] = [];
  protected loading = true;
  protected saving = false;
  protected readonly columns = ['type', 'customer', 'notes', 'createdAt'];

  protected readonly form = this.fb.nonNullable.group({
    type: ['CALL', Validators.required],
    customerId: [0, Validators.min(1)],
    notes: ['']
  });

  ngOnInit(): void {
    this.loadCustomers();
    this.loadActivities();
  }

  submit(): void {
    if (this.form.invalid || this.saving) return;

    this.saving = true;
    this.activitiesService.create(this.form.getRawValue()).subscribe({
      next: () => {
        this.saving = false;
        this.form.patchValue({ type: 'CALL', notes: '' });
        this.snackBar.open('Activity logged successfully', 'Close', { duration: 3000 });
        this.loadActivities();
      },
      error: err => {
        this.saving = false;
        const msg = (err?.error?.message as string | undefined) ?? 'Failed to log activity';
        this.snackBar.open(msg, 'Close', { duration: 5000 });
      }
    });
  }

  protected typeConfig(type: string) {
    return TYPE_CONFIG[type] ?? { bg: '#f1f5f9', color: '#475569', icon: 'circle' };
  }

  private loadActivities(): void {
    this.loading = true;
    this.activitiesService.list().subscribe({
      next: acts => { this.activities = acts; this.loading = false; },
      error: () => { this.loading = false; }
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
      },
      error: () => {}
    });
  }
}
