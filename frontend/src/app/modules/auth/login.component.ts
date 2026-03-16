import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'crm-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  styles: [`
    .form-grid { display: grid; gap: 4px; }
    .full-width { width: 100%; }
    .divider {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 16px 0;
      color: #94a3b8;
      font-size: 12px;
    }
    .divider::before, .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #e2e8f0;
    }
  `],
  template: `
    <div style="padding: 24px">
      <h1 style="margin: 0 0 4px; font-size: 22px; font-weight: 700; color: #0f172a">
        Sign in
      </h1>
      <p style="color: #64748b; font-size: 14px; margin: 0 0 24px">
        Select a workspace after signing in.
      </p>

      <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email</mat-label>
          <mat-icon matPrefix style="color: #94a3b8; margin-right: 4px">email</mat-icon>
          <input
            matInput
            formControlName="email"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
          />
          <mat-error *ngIf="form.get('email')?.hasError('required')">
            Email is required
          </mat-error>
          <mat-error *ngIf="form.get('email')?.hasError('email')">
            Enter a valid email address
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Password</mat-label>
          <input
            matInput
            formControlName="password"
            [type]="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
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
          <mat-error *ngIf="form.get('password')?.hasError('required')">
            Password is required
          </mat-error>
        </mat-form-field>

        <button
          mat-flat-button
          color="primary"
          type="submit"
          [disabled]="form.invalid || loading"
          style="height: 48px; font-size: 15px; font-weight: 600; margin-top: 4px"
        >
          <mat-spinner
            *ngIf="loading"
            diameter="20"
            style="display: inline-block; margin-right: 8px"
          />
          {{ loading ? 'Signing in…' : 'Continue' }}
        </button>

      </form>

      <div class="divider">or</div>

      <a
        routerLink="/auth/register"
        mat-stroked-button
        style="width: 100%; height: 44px; font-size: 14px; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 6px"
      >
        <mat-icon style="font-size: 18px; width: 18px; height: 18px">add_business</mat-icon>
        Create a new workspace
      </a>
    </div>
  `
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected loading = false;
  protected showPassword = false;

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  constructor() {
    if (this.authService.hasAccessToken()) {
      void this.router.navigate(['/dashboard']);
    }
  }

  submit(): void {
    if (this.form.invalid || this.loading) return;

    this.loading = true;

    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading = false;
        void this.router.navigate(['/workspace']);
      },
      error: err => {
        this.loading = false;
        const msg =
          (err?.error?.message as string | undefined) ??
          'Login failed. Check your credentials and try again.';
        this.snackBar.open(msg, 'Close', { duration: 5000 });
      }
    });
  }
}
