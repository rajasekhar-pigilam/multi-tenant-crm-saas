import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

function slugValidator(control: AbstractControl): ValidationErrors | null {
  const val: string = control.value ?? '';
  if (!val) return null;
  return /^[a-z0-9-]+$/.test(val)
    ? null
    : { invalidSlug: 'Only lowercase letters, digits, and hyphens are allowed' };
}

function passwordMatchValidator(
  control: AbstractControl
): ValidationErrors | null {
  const password = control.get('adminPassword')?.value;
  const confirm = control.get('confirmPassword')?.value;
  if (password && confirm && password !== confirm) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'crm-register',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  styles: [`
    .form-grid {
      display: grid;
      gap: 4px;
    }
    .full-width { width: 100%; }
    .slug-preview {
      font-size: 12px;
      color: #64748b;
      margin-top: -8px;
      margin-bottom: 8px;
      padding: 6px 12px;
      background: #f1f5f9;
      border-radius: 6px;
      font-family: monospace;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .slug-preview mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: #3b82f6;
    }
    .divider {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 12px 0;
      color: #94a3b8;
      font-size: 12px;
    }
    .divider::before, .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #e2e8f0;
    }
    .provisioning-notice {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 13px;
      color: #1e40af;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 16px;
    }
    .provisioning-notice mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      margin-top: 1px;
      flex-shrink: 0;
    }
    .success-card {
      text-align: center;
      padding: 16px 0;
    }
    .success-icon {
      font-size: 56px;
      width: 56px;
      height: 56px;
      color: #22c55e;
      margin-bottom: 12px;
    }
    .field-hint {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 2px;
    }
  `],
  template: `
    <!-- Progress bar during provisioning -->
    <mat-progress-bar
      *ngIf="provisioning"
      mode="indeterminate"
      color="primary"
      style="position: absolute; top: 0; left: 0; right: 0; border-radius: 8px 8px 0 0"
    />

    <!-- ── SUCCESS STATE ─────────────────────────────────────────── -->
    <div *ngIf="succeeded" class="success-card" style="padding: 24px">
      <mat-icon class="success-icon">check_circle</mat-icon>
      <h2 style="margin: 0 0 8px; color: #0f172a">Workspace ready!</h2>
      <p style="color: #475569; margin: 0 0 20px; font-size: 14px">
        <strong>{{ successTenantName }}</strong> has been provisioned and your
        admin account is ready.
      </p>
      <p style="color: #64748b; font-size: 13px; margin: 0 0 20px">
        Signing you in automatically…
      </p>
      <mat-progress-spinner
        mode="indeterminate"
        diameter="32"
        style="margin: 0 auto"
      />
    </div>

    <!-- ── REGISTRATION FORM ─────────────────────────────────────── -->
    <div *ngIf="!succeeded" style="padding: 24px">
      <h1 style="margin: 0 0 4px; font-size: 22px; font-weight: 700; color: #0f172a">
        Create a workspace
      </h1>
      <p style="color: #64748b; font-size: 14px; margin: 0 0 20px">
        Set up your CRM workspace and admin account in one step.
      </p>

      <div class="provisioning-notice">
        <mat-icon>info</mat-icon>
        <span>
          A dedicated database will be provisioned for your workspace. This takes
          5–10 seconds.
        </span>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">

        <!-- ── Workspace details section ── -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Workspace name</mat-label>
          <input
            matInput
            formControlName="tenantName"
            placeholder="Acme Corporation"
            autocomplete="organization"
          />
          <mat-hint>Your company or team name</mat-hint>
          <mat-error *ngIf="form.get('tenantName')?.hasError('required')">
            Workspace name is required
          </mat-error>
          <mat-error *ngIf="form.get('tenantName')?.hasError('minlength')">
            At least 2 characters required
          </mat-error>
        </mat-form-field>

        <!-- Slug preview / edit -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Workspace ID</mat-label>
          <input
            matInput
            formControlName="slug"
            placeholder="acme-corporation"
            autocomplete="off"
          />
          <mat-icon
            matSuffix
            [matTooltip]="'Used as your database identifier. Lowercase letters, digits and hyphens only.'"
            style="cursor: help; color: #94a3b8"
          >help_outline</mat-icon>
          <mat-hint>Unique identifier — cannot be changed later</mat-hint>
          <mat-error *ngIf="form.get('slug')?.hasError('required')">
            Workspace ID is required
          </mat-error>
          <mat-error *ngIf="form.get('slug')?.hasError('minlength')">
            At least 2 characters required
          </mat-error>
          <mat-error *ngIf="form.get('slug')?.hasError('maxlength')">
            Maximum 40 characters
          </mat-error>
          <mat-error *ngIf="form.get('slug')?.hasError('invalidSlug')">
            {{ form.get('slug')?.getError('invalidSlug') }}
          </mat-error>
        </mat-form-field>

        <div class="divider">Admin account</div>

        <!-- ── Admin account section ── -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Admin email</mat-label>
          <input
            matInput
            formControlName="adminEmail"
            type="email"
            placeholder="you@company.com"
            autocomplete="email"
          />
          <mat-icon matPrefix style="color: #94a3b8; margin-right: 4px">email</mat-icon>
          <mat-error *ngIf="form.get('adminEmail')?.hasError('required')">
            Email is required
          </mat-error>
          <mat-error *ngIf="form.get('adminEmail')?.hasError('email')">
            Enter a valid email address
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" formGroupName="passwords">
          <mat-label>Password</mat-label>
          <input
            matInput
            formControlName="adminPassword"
            [type]="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
          />
          <button
            mat-icon-button
            matSuffix
            type="button"
            (click)="showPassword = !showPassword"
            [attr.aria-label]="showPassword ? 'Hide password' : 'Show password'"
          >
            <mat-icon>{{ showPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          <mat-hint>Minimum 8 characters</mat-hint>
          <mat-error *ngIf="form.get('passwords.adminPassword')?.hasError('required')">
            Password is required
          </mat-error>
          <mat-error *ngIf="form.get('passwords.adminPassword')?.hasError('minlength')">
            Password must be at least 8 characters
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" formGroupName="passwords">
          <mat-label>Confirm password</mat-label>
          <input
            matInput
            formControlName="confirmPassword"
            [type]="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
          />
          <mat-error *ngIf="form.get('passwords.confirmPassword')?.hasError('required')">
            Please confirm your password
          </mat-error>
          <mat-error *ngIf="form.get('passwords')?.hasError('passwordMismatch')">
            Passwords do not match
          </mat-error>
        </mat-form-field>

        <button
          mat-flat-button
          color="primary"
          type="submit"
          [disabled]="form.invalid || provisioning"
          style="height: 48px; font-size: 15px; font-weight: 600; margin-top: 4px"
        >
          <mat-icon *ngIf="!provisioning" style="margin-right: 6px">rocket_launch</mat-icon>
          <mat-spinner
            *ngIf="provisioning"
            diameter="20"
            style="display: inline-block; margin-right: 8px"
          />
          {{ provisioning ? 'Provisioning workspace…' : 'Create workspace' }}
        </button>

      </form>

      <p style="text-align: center; margin: 16px 0 0; font-size: 13px; color: #64748b">
        Already have a workspace?
        <a routerLink="/auth/login" style="color: #3b82f6; text-decoration: none; font-weight: 500">
          Sign in
        </a>
      </p>
    </div>
  `
})
export class RegisterComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroy$ = new Subject<void>();

  protected provisioning = false;
  protected succeeded = false;
  protected successTenantName = '';
  protected showPassword = false;

  protected readonly form = this.fb.group({
    tenantName: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(100)]
    ],
    slug: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(40),
        slugValidator
      ]
    ],
    adminEmail: ['', [Validators.required, Validators.email]],
    passwords: this.fb.group(
      {
        adminPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required]
      },
      { validators: passwordMatchValidator }
    )
  });

  ngOnInit(): void {
    if (this.authService.hasAccessToken()) {
      void this.router.navigate(['/dashboard']);
      return;
    }

    // Auto-derive slug from tenant name
    this.form
      .get('tenantName')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(name => {
        const slugControl = this.form.get('slug');
        if (!name) return;
        // Only auto-update if the slug hasn't been manually edited yet
        const currentSlug = slugControl?.value ?? '';
        const expectedSlug = this.toSlug(
          this.getPreviousName() ?? ''
        );
        if (currentSlug === '' || currentSlug === expectedSlug) {
          slugControl?.setValue(this.toSlug(name), { emitEvent: false });
        }
        this.previousName = name;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  submit(): void {
    if (this.form.invalid || this.provisioning) return;

    const { tenantName, slug, adminEmail, passwords } = this.form.getRawValue();
    const adminPassword = passwords.adminPassword;

    if (!tenantName || !slug || !adminEmail || !adminPassword) return;

    this.provisioning = true;
    this.form.disable();

    this.authService
      .registerTenant({ tenantName, slug, adminEmail, adminPassword })
      .subscribe({
        next: response => {
          this.successTenantName = response.tenant.name;
          this.succeeded = true;
          this.provisioning = false;

          // Auto-login using the registered credentials
          this.authService.login({ email: adminEmail, password: adminPassword }).subscribe({
            next: () => {
              // If only one tenant, auto-select it and go to dashboard
              const tenants = this.authService.getAvailableTenants();
              if (tenants.length === 1 && tenants[0]) {
                const tenantId = tenants[0].id;
                this.authService.selectTenant(tenantId).subscribe({
                  next: () => void this.router.navigate(['/dashboard']),
                  error: () => void this.router.navigate(['/workspace'])
                });
              } else {
                void this.router.navigate(['/workspace']);
              }
            },
            error: () => {
              // Auto-login failed – redirect to login with a success toast
              this.snackBar.open(
                `Workspace "${response.tenant.name}" created! Please sign in.`,
                'OK',
                { duration: 6000 }
              );
              void this.router.navigate(['/auth/login']);
            }
          });
        },
        error: err => {
          this.provisioning = false;
          this.form.enable();

          const message =
            Array.isArray(err?.error?.message)
              ? (err.error.message as string[]).join(', ')
              : (err?.error?.message as string | undefined) ??
                'Workspace creation failed. Please try again.';

          this.snackBar.open(message, 'Close', { duration: 6000 });
        }
      });
  }

  private previousName: string | null = null;

  private getPreviousName(): string | null {
    return this.previousName;
  }

  private toSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
  }
}
