import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'crm-dashboard-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <mat-sidenav-container style="height: 100vh">
      <mat-sidenav mode="side" opened>
        <div style="padding: 16px; font-weight: 600">CRM SaaS</div>
        <mat-nav-list>
          <a mat-list-item routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
          <a mat-list-item routerLink="/customers" routerLinkActive="active">Customers</a>
          <a mat-list-item routerLink="/deals" routerLinkActive="active">Deals</a>
          <a mat-list-item routerLink="/activities" routerLinkActive="active">Activities</a>
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar color="primary">
          <span>Multi-Tenant CRM</span>
          <span class="toolbar-spacer"></span>
          <span style="margin-right: 12px">{{ authService.getActiveTenant()?.name }}</span>
          <button mat-button type="button" (click)="logout()">
            <mat-icon>logout</mat-icon>
            Logout
          </button>
        </mat-toolbar>

        <div class="page-shell">
          <router-outlet />
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `
})
export class DashboardLayoutComponent {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/auth/login']);
  }
}
