import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { CountriesService } from '../../core/services/countries.service';
import { CustomersService } from '../../core/services/customers.service';
import { Country, Customer } from '../../shared/models/crm.models';

@Component({
  selector: 'crm-customers',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatTableModule,
    MatTabsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    MatTooltipModule
  ],
  styles: [`
    .page-layout {
      display: grid;
      grid-template-columns: 340px 1fr;
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
    .empty-state mat-icon { font-size: 40px; width: 40px; height: 40px; margin: 0 auto 8px; display: block; }
    .empty-state p { margin: 0; font-size: 13px; }
    .row-count { font-size: 12px; color: #94a3b8; padding: 0 20px 12px; }
    .loading-center { display:flex; justify-content:center; padding:48px; }

    /* Countries manage tab */
    .countries-list { padding: 0 20px 20px; }
    .country-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .country-row:last-child { border-bottom: none; }
    .country-info { display: flex; align-items: center; gap: 10px; }
    .country-code {
      font-size: 11px;
      font-weight: 700;
      background: #f1f5f9;
      color: #64748b;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }
    .country-name { font-size: 14px; color: #1e293b; }
    .inactive-label { font-size: 12px; color: #94a3b8; margin-left: 4px; }
    .admin-note {
      font-size: 12px;
      color: #64748b;
      padding: 12px 20px;
      background: #f8fafc;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      gap: 6px;
    }
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

            <!-- Country select — shows only active countries for this tenant -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Country</mat-label>
              <mat-icon matPrefix style="color:#94a3b8;margin-right:4px">public</mat-icon>
              <mat-select formControlName="countryCode">
                <mat-option [value]="null">— None —</mat-option>
                @for (c of activeCountries; track c.code) {
                  <mat-option [value]="c.code">{{ c.name }}</mat-option>
                }
              </mat-select>
              @if (loadingCountries) {
                <mat-hint>Loading countries…</mat-hint>
              }
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

      <!-- ── Right panel: Customers table + (admin) Manage Countries tabs ── -->
      <div class="panel">
        <mat-tab-group animationDuration="150ms">

          <!-- Tab 1: All Customers -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon style="margin-right:6px;font-size:18px;height:18px;width:18px">people</mat-icon>
              Customers
            </ng-template>

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
                <ng-container matColumnDef="country">
                  <th mat-header-cell *matHeaderCellDef>Country</th>
                  <td mat-cell *matCellDef="let item">
                    @if (item.country) {
                      <span style="display:flex;align-items:center;gap:6px">
                        <span class="country-code">{{ item.country.code }}</span>
                        {{ item.country.name }}
                      </span>
                    } @else {
                      <span style="color:#94a3b8">—</span>
                    }
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="columns"></tr>
                <tr mat-row *matRowDef="let row; columns: columns"></tr>
              </table>
            }
          </mat-tab>

          <!-- Tab 2: Manage Countries (admin only) -->
          @if (isAdmin) {
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon style="margin-right:6px;font-size:18px;height:18px;width:18px">flag</mat-icon>
                Countries
              </ng-template>

              <div class="admin-note">
                <mat-icon style="font-size:16px;width:16px;height:16px">info_outline</mat-icon>
                Disabled countries are hidden from the Add Customer form.
                Existing customers with that country are not affected.
              </div>

              @if (loadingAllCountries) {
                <div class="loading-center"><mat-spinner diameter="32" /></div>
              } @else {
                <div class="countries-list">
                  @for (c of allCountries; track c.code) {
                    <div class="country-row">
                      <div class="country-info">
                        <span class="country-code">{{ c.code }}</span>
                        <span class="country-name" [style.opacity]="c.isActive ? 1 : 0.45">
                          {{ c.name }}
                        </span>
                        @if (!c.isActive) {
                          <span class="inactive-label">(disabled)</span>
                        }
                      </div>
                      <mat-slide-toggle
                        [checked]="c.isActive"
                        [matTooltip]="c.isActive ? 'Disable' : 'Enable'"
                        (change)="toggleCountry(c)"
                        color="primary">
                      </mat-slide-toggle>
                    </div>
                  }
                </div>
              }
            </mat-tab>
          }

        </mat-tab-group>
      </div>

    </div>
  `
})
export class CustomersComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly customersService = inject(CustomersService);
  private readonly countriesService = inject(CountriesService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cd = inject(ChangeDetectorRef);

  protected customers: Customer[] = [];
  protected activeCountries: Country[] = [];
  protected allCountries: Country[] = [];
  protected loading = true;
  protected saving = false;
  protected loadingCountries = true;
  protected loadingAllCountries = false;

  protected readonly columns = ['name', 'email', 'phone', 'company', 'country'];

  protected readonly isAdmin = this.decodeRole() === 'ADMIN';

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    company: [''],
    countryCode: [null as string | null]
  });

  ngOnInit(): void {
    this.loadCustomers();
    this.loadActiveCountries();
    if (this.isAdmin) {
      this.loadAllCountries();
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving) return;
    this.saving = true;
    this.cd.markForCheck();

    const raw = this.form.getRawValue();
    const payload = {
      name: raw.name,
      email: raw.email,
      phone: raw.phone || undefined,
      company: raw.company || undefined,
      countryCode: raw.countryCode ?? undefined
    };

    this.customersService
      .create(payload)
      .pipe(finalize(() => { this.saving = false; this.cd.markForCheck(); }))
      .subscribe({
        next: () => {
          this.form.reset({ name: '', email: '', phone: '', company: '', countryCode: null });
          this.snackBar.open('Customer saved successfully', 'Close', { duration: 3000 });
          this.loadCustomers();
        },
        error: (err: HttpErrorResponse) => {
          const msg = (err?.error?.message as string | undefined) ?? 'Failed to save customer';
          this.snackBar.open(msg, 'Close', { duration: 5000 });
        }
      });
  }

  toggleCountry(country: Country): void {
    this.countriesService.toggle(country.code).subscribe({
      next: updated => {
        const idx = this.allCountries.findIndex(c => c.code === updated.code);
        if (idx !== -1) {
          this.allCountries = [
            ...this.allCountries.slice(0, idx),
            updated,
            ...this.allCountries.slice(idx + 1)
          ];
        }
        this.activeCountries = this.allCountries.filter(c => c.isActive);
        this.cd.markForCheck();
        const msg = updated.isActive
          ? `${updated.name} enabled`
          : `${updated.name} disabled`;
        this.snackBar.open(msg, 'Close', { duration: 2500 });
      },
      error: (err: HttpErrorResponse) => {
        const msg = (err?.error?.message as string | undefined) ?? 'Failed to toggle country';
        this.snackBar.open(msg, 'Close', { duration: 5000 });
        this.cd.markForCheck();
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
        next: customers => { this.customers = customers; this.cd.markForCheck(); },
        error: (err: HttpErrorResponse) => {
          const msg = (err?.error?.message as string | undefined) ?? 'Failed to load customers';
          this.snackBar.open(msg, 'Close', { duration: 5000 });
        }
      });
  }

  private loadActiveCountries(): void {
    this.loadingCountries = true;
    this.cd.markForCheck();
    this.countriesService
      .listActive()
      .pipe(finalize(() => { this.loadingCountries = false; this.cd.markForCheck(); }))
      .subscribe({
        next: countries => { this.activeCountries = countries; this.cd.markForCheck(); },
        error: () => { this.activeCountries = []; this.cd.markForCheck(); }
      });
  }

  private loadAllCountries(): void {
    this.loadingAllCountries = true;
    this.cd.markForCheck();
    this.countriesService
      .list()
      .pipe(finalize(() => { this.loadingAllCountries = false; this.cd.markForCheck(); }))
      .subscribe({
        next: countries => { this.allCountries = countries; this.cd.markForCheck(); },
        error: () => { this.allCountries = []; this.cd.markForCheck(); }
      });
  }

  /** Decode the role claim from the stored access token without an extra library. */
  private decodeRole(): string {
    try {
      const token = localStorage.getItem('accessToken') ?? '';
      const payload = JSON.parse(atob(token.split('.')[1] ?? ''));
      return (payload.role as string | undefined) ?? '';
    } catch {
      return '';
    }
  }
}
