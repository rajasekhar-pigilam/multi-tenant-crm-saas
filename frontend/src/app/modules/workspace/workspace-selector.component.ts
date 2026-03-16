import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'crm-workspace-selector',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  styles: [`
    .workspace-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 14px 16px;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
      margin-bottom: 10px;
      background: #fff;
    }
    .workspace-card:hover {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
      background: #f8faff;
    }
    .workspace-card.loading {
      pointer-events: none;
      opacity: 0.7;
    }
    .ws-avatar {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 18px;
      font-weight: 700;
      color: #fff;
      text-transform: uppercase;
    }
    .ws-info { flex: 1; min-width: 0; }
    .ws-name {
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
    }
    .ws-role {
      font-size: 12px;
      color: #64748b;
      text-transform: capitalize;
      margin-top: 2px;
    }
    .ws-arrow mat-icon {
      color: #cbd5e1;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .workspace-card:hover .ws-arrow mat-icon { color: #3b82f6; }
  `],
  template: `
    <div style="padding: 28px 24px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <div style="background:#3b82f6;border-radius:8px;width:32px;height:32px;display:flex;align-items:center;justify-content:center">
          <mat-icon style="color:#fff;font-size:18px;width:18px;height:18px">hub</mat-icon>
        </div>
        <h1 style="margin:0;font-size:20px;font-weight:700;color:#0f172a">Select Workspace</h1>
      </div>
      <p style="color:#64748b;font-size:13px;margin:0 0 24px 42px">
        Choose the workspace you want to work in.
      </p>

      <div *ngFor="let tenant of tenants">
        <div
          class="workspace-card"
          [class.loading]="loadingId === tenant.id"
          (click)="selectTenant(tenant.id)"
          role="button"
          [attr.aria-label]="'Select ' + tenant.name"
        >
          <div class="ws-avatar">{{ tenant.name.charAt(0) }}</div>
          <div class="ws-info">
            <div class="ws-name">{{ tenant.name }}</div>
            <div class="ws-role">
              <mat-icon style="font-size:11px;width:11px;height:11px;vertical-align:middle">verified_user</mat-icon>
              {{ (tenant.role ?? 'member') | lowercase }}
            </div>
          </div>
          <div class="ws-arrow">
            <mat-spinner *ngIf="loadingId === tenant.id" diameter="20" />
            <mat-icon *ngIf="loadingId !== tenant.id">chevron_right</mat-icon>
          </div>
        </div>
      </div>

      <p style="text-align:center;margin:20px 0 0;font-size:12px;color:#94a3b8">
        <a routerLink="/auth/login" style="color:#64748b;text-decoration:none">
          ← Back to login
        </a>
      </p>
    </div>
  `
})
export class WorkspaceSelectorComponent {
  protected readonly tenants = inject(AuthService).getAvailableTenants();
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected loadingId: number | null = null;

  constructor() {
    if (this.authService.hasAccessToken()) {
      void this.router.navigate(['/dashboard']);
      return;
    }

    if (!this.authService.hasPendingWorkspaceSelection()) {
      void this.router.navigate(['/auth/login']);
    }
  }

  selectTenant(tenantId: number): void {
    if (this.loadingId !== null) return;
    this.loadingId = tenantId;

    this.authService.selectTenant(tenantId).subscribe({
      next: () => {
        this.loadingId = null;
        void this.router.navigate(['/dashboard']);
      },
      error: err => {
        this.loadingId = null;
        const msg = (err?.error?.message as string | undefined) ?? 'Unable to select workspace.';
        this.snackBar.open(msg, 'Close', { duration: 4000 });
      }
    });
  }
}
