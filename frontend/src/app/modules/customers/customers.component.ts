import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { finalize } from 'rxjs';
import { CustomersService } from '../../core/services/customers.service';
import { Customer } from '../../shared/models/crm.models';

@Component({
  selector: 'crm-customers',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
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
    .row-count { font-size: 12px; color: #94a3b8; padding: 0 20px 12px; }
    .loading-center { display:flex; justify-content:center; padding:48px; }
  `],
  template: `
    <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #0f172a">Customers</h2>

    <div class="page-layout">

      <!-- ── Create Form ── -->
      <div class="panel">
        <div class="panel-header">
          <mat-icon>person_add</mat-icon>
          <span class="panel-title">New Customer</span>
        </div>
        <div class="panel-body">
          <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Full name</mat-label>
              <mat-icon matPrefix style="color:#94a3b8;margin-right:4px">badge</mat-icon>
              <input matInput formControlName="name" autocomplete="off" />
              @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
                <mat-error>Name is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <mat-icon matPrefix style="color:#94a3b8;margin-right:4px">email</mat-icon>
              <input matInput type="email" formControlName="email" autocomplete="off" />
              @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
                <mat-error>Email is required</mat-error>
              }
              @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
                <mat-error>Invalid email</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Phone</mat-label>
              <mat-icon matPrefix style="color:#94a3b8;margin-right:4px">phone</mat-icon>
              <input matInput formControlName="phone" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Company</mat-label>
              <mat-icon matPrefix style="color:#94a3b8;margin-right:4px">business</mat-icon>
              <input matInput formControlName="company" />
            </mat-form-field>

            <button mat-flat-button color="primary" type="submit"
              [disabled]="form.invalid || saving" style="height:44px;margin-top:4px">
              @if (saving) {
                <mat-spinner diameter="18" style="display:inline-block;margin-right:8px;vertical-align:middle" />
              }
              {{ saving ? 'Saving…' : 'Save Customer' }}
            </button>

          </form>
        </div>
      </div>

      <!-- ── Customers Table ── -->
      <div class="panel">
        <div class="panel-header">
          <mat-icon>people</mat-icon>
          <span class="panel-title">All Customers</span>
        </div>

        @if (loading) {
          <div class="loading-center"><mat-spinner diameter="36" /></div>
        } @else if (customers.length === 0) {
          <div class="empty-state">
            <mat-icon>people_outline</mat-icon>
            <p>No customers yet.<br>Use the form to add the first one.</p>
          </div>
        } @else {
          <div class="row-count">{{ customers.length }} customer{{ customers.length !== 1 ? 's' : '' }}</div>
          <table mat-table [dataSource]="customers">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let item">{{ item.name }}</td>
            </ng-container>
            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef>Email</th>
              <td mat-cell *matCellDef="let item">{{ item.email }}</td>
            </ng-container>
            <ng-container matColumnDef="phone">
              <th mat-header-cell *matHeaderCellDef>Phone</th>
              <td mat-cell *matCellDef="let item">{{ item.phone || '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="company">
              <th mat-header-cell *matHeaderCellDef>Company</th>
              <td mat-cell *matCellDef="let item">{{ item.company || '—' }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
          </table>
        }
      </div>

    </div>
  `
})
export class CustomersComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly customersService = inject(CustomersService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cd = inject(ChangeDetectorRef);

  protected customers: Customer[] = [];
  protected loading = true;
  protected saving = false;
  protected readonly columns = ['name', 'email', 'phone', 'company'];

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    company: ['']
  });

  ngOnInit(): void {
    this.loadCustomers();
  }

  submit(): void {
    if (this.form.invalid || this.saving) return;
    this.saving = true;
    this.cd.markForCheck();
    this.customersService
      .create(this.form.getRawValue())
      .pipe(finalize(() => { this.saving = false; this.cd.markForCheck(); }))
      .subscribe({
        next: () => {
          this.form.reset({ name: '', email: '', phone: '', company: '' });
          this.snackBar.open('Customer saved successfully', 'Close', { duration: 3000 });
          this.loadCustomers();
        },
        error: (err: HttpErrorResponse) => {
          const msg = (err?.error?.message as string | undefined) ?? 'Failed to save customer';
          this.snackBar.open(msg, 'Close', { duration: 5000 });
        }
      });
  }

  private loadCustomers(): void {
    this.loading = true;
    this.cd.markForCheck();
    this.customersService
      .list()
      .pipe(finalize(() => { this.loading = false; this.cd.markForCheck(); }))
      .subscribe({
        next: customers => {
          this.customers = customers;
          this.cd.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          const msg = (err?.error?.message as string | undefined) ?? 'Failed to load customers';
          this.snackBar.open(msg, 'Close', { duration: 5000 });
        }
      });
  }
}
