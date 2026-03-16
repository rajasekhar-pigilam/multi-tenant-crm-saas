import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
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
    MatIconModule,
    MatDividerModule,
    MatTooltipModule
  ],
  styles: [`
    .sidenav {
      width: 230px;
      background: #0f172a;
      color: #e2e8f0;
      display: flex;
      flex-direction: column;
    }
    .sidenav-logo {
      padding: 20px 16px 12px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .sidenav-logo .logo-icon {
      background: #3b82f6;
      border-radius: 8px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sidenav-logo .logo-icon mat-icon {
      color: #fff;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .sidenav-logo .logo-text {
      font-size: 15px;
      font-weight: 700;
      color: #f1f5f9;
      letter-spacing: 0.3px;
    }
    .sidenav-logo .logo-sub {
      font-size: 11px;
      color: #94a3b8;
    }
    .nav-section-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #475569;
      padding: 12px 20px 4px;
    }
    .nav-item {
      color: #94a3b8 !important;
      border-radius: 8px !important;
      margin: 2px 8px !important;
      font-size: 14px !important;
    }
    .nav-item mat-icon {
      color: #64748b;
      margin-right: 10px;
    }
    .nav-item.active {
      background: rgba(59, 130, 246, 0.15) !important;
      color: #93c5fd !important;
    }
    .nav-item.active mat-icon {
      color: #60a5fa;
    }
    .nav-item:hover:not(.active) {
      background: rgba(255,255,255,0.05) !important;
      color: #e2e8f0 !important;
    }
    .sidenav-footer {
      margin-top: auto;
      padding: 12px 8px;
      border-top: 1px solid rgba(255,255,255,0.08);
    }
    .toolbar {
      background: #fff !important;
      border-bottom: 1px solid #e2e8f0;
      color: #0f172a !important;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06) !important;
    }
    .tenant-chip {
      background: #eff6ff;
      color: #1d4ed8;
      border-radius: 20px;
      padding: 4px 12px;
      font-size: 13px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .tenant-chip mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: #3b82f6;
    }
    .page-content {
      padding: 24px;
      min-height: calc(100vh - 64px);
      background: #f8fafc;
    }
  `],
  template: `
    <mat-sidenav-container style="height: 100vh">

      <mat-sidenav class="sidenav" mode="side" opened>
        <div class="sidenav-logo">
          <div class="logo-icon">
            <mat-icon>hub</mat-icon>
          </div>
          <div>
            <div class="logo-text">CRM SaaS</div>
            <div class="logo-sub">Multi-Tenant</div>
          </div>
        </div>

        <div class="nav-section-label">Main</div>

        <mat-nav-list>
          <a mat-list-item class="nav-item"
             routerLink="/dashboard" routerLinkActive="active">
            <mat-icon matListItemIcon>dashboard</mat-icon>
            <span matListItemTitle>Dashboard</span>
          </a>
          <a mat-list-item class="nav-item"
             routerLink="/customers" routerLinkActive="active">
            <mat-icon matListItemIcon>people</mat-icon>
            <span matListItemTitle>Customers</span>
          </a>
          <a mat-list-item class="nav-item"
             routerLink="/deals" routerLinkActive="active">
            <mat-icon matListItemIcon>handshake</mat-icon>
            <span matListItemTitle>Deals</span>
          </a>
          <a mat-list-item class="nav-item"
             routerLink="/activities" routerLinkActive="active">
            <mat-icon matListItemIcon>event_note</mat-icon>
            <span matListItemTitle>Activities</span>
          </a>
        </mat-nav-list>

        <div class="sidenav-footer">
          <button
            mat-list-item
            class="nav-item"
            style="width: 100%; text-align: left"
            type="button"
            (click)="logout()"
          >
            <mat-icon matListItemIcon>logout</mat-icon>
            <span matListItemTitle>Sign out</span>
          </button>
        </div>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar class="toolbar">
          <span style="font-size: 16px; font-weight: 600; color: #1e293b">
            Multi-Tenant CRM
          </span>
          <span class="toolbar-spacer"></span>

          <div *ngIf="authService.getActiveTenant() as tenant" class="tenant-chip">
            <mat-icon>business</mat-icon>
            {{ tenant.name }}
          </div>

          <div
            *ngIf="authService.getCurrentUser() as user"
            style="margin-left: 16px; font-size: 13px; color: #475569; display: flex; align-items: center; gap: 6px"
          >
            <mat-icon style="font-size: 18px; width: 18px; height: 18px; color: #94a3b8">account_circle</mat-icon>
            {{ user.email }}
          </div>
        </mat-toolbar>

        <div class="page-content">
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
