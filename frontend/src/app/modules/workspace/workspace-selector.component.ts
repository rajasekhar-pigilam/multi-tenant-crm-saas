import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'crm-workspace-selector',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatListModule, MatSnackBarModule],
  template: `
    <div style="padding: 24px">
      <h1>Select Workspace</h1>
      <p>Choose the tenant you want to work with for this session.</p>

      <mat-nav-list>
        <button
          mat-list-item
          type="button"
          *ngFor="let tenant of tenants"
          (click)="selectTenant(tenant.id)"
        >
          <span matListItemTitle>{{ tenant.name }}</span>
          <span matListItemLine>{{ tenant.role }}</span>
        </button>
      </mat-nav-list>
    </div>
  `
})
export class WorkspaceSelectorComponent {
  protected readonly tenants = inject(AuthService).getAvailableTenants();
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

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
    this.authService.selectTenant(tenantId).subscribe({
      next: () => {
        void this.router.navigate(['/dashboard']);
      },
      error: error => {
        this.snackBar.open(
          error?.error?.message ?? 'Unable to select workspace.',
          'Close',
          { duration: 4000 }
        );
      }
    });
  }
}
