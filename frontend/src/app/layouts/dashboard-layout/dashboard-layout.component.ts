import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'crm-dashboard-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatIconModule
  ],
  styles: [`
    /* ── Sidenav ── */
    .sidenav {
      width: 230px;
      background: #0f172a;
      display: flex;
      flex-direction: column;
      border-right: none !important;
    }
    .logo-row {
      padding: 20px 16px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .logo-icon {
      background: #3b82f6;
      border-radius: 8px;
      width: 34px; height: 34px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .logo-icon mat-icon { color: #fff; font-size: 18px; width: 18px; height: 18px; }
    .logo-text  { font-size: 14px; font-weight: 700; color: #f1f5f9; letter-spacing: 0.2px; }
    .logo-sub   { font-size: 11px; color: #64748b; margin-top: 1px; }

    /* ── Nav ── */
    .nav-section { font-size: 10px; font-weight: 600; text-transform: uppercase;
                   letter-spacing: 1px; color: #475569; padding: 14px 18px 6px; }
    .nav-list { display: flex; flex-direction: column; gap: 2px; padding: 0 8px; }
    .nav-link {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 12px;
      border-radius: 8px;
      text-decoration: none;
      font-size: 13.5px; font-weight: 500;
      color: #94a3b8;
      transition: background 0.15s, color 0.15s;
    }
    .nav-link mat-icon { font-size: 18px; width: 18px; height: 18px; color: #64748b; flex-shrink: 0; }
    .nav-link:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
    .nav-link:hover mat-icon { color: #94a3b8; }
    .nav-link.active { background: rgba(59,130,246,0.18); color: #93c5fd; }
    .nav-link.active mat-icon { color: #60a5fa; }

    /* ── Footer ── */
    .sidenav-footer {
      margin-top: auto;
      padding: 10px 8px 14px;
      border-top: 1px solid rgba(255,255,255,0.07);
    }
    .logout-btn {
      display: flex; align-items: center; gap: 10px;
      width: 100%; padding: 9px 12px;
      border-radius: 8px;
      background: none; border: none; cursor: pointer;
      font-size: 13.5px; font-weight: 500; color: #94a3b8;
      transition: background 0.15s, color 0.15s;
    }
    .logout-btn mat-icon { font-size: 18px; width: 18px; height: 18px; color: #64748b; }
    .logout-btn:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
    .logout-btn:hover mat-icon { color: #94a3b8; }

    /* ── Toolbar ── */
    .toolbar {
      background: #fff !important;
      border-bottom: 1px solid #e2e8f0;
      color: #0f172a !important;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04) !important;
      gap: 0;
    }
    .toolbar-spacer { flex: 1; }
    .tenant-chip {
      background: #eff6ff; color: #1d4ed8;
      border-radius: 20px; padding: 4px 12px;
      font-size: 13px; font-weight: 500;
      display: flex; align-items: center; gap: 4px;
    }
    .tenant-chip mat-icon { font-size: 14px; width: 14px; height: 14px; color: #3b82f6; }
    .user-info {
      margin-left: 14px; font-size: 13px; color: #475569;
      display: flex; align-items: center; gap: 5px;
    }
    .user-info mat-icon { font-size: 17px; width: 17px; height: 17px; color: #94a3b8; }

    /* ── Content ── */
    .page-content {
      padding: 24px;
      min-height: calc(100vh - 64px);
      background: #f8fafc;
    }
  `],
  template: `
    <mat-sidenav-container style="height:100vh">

      <mat-sidenav class="sidenav" mode="side" opened>

        <!-- Logo -->
        <div class="logo-row">
          <div class="logo-icon"><mat-icon>hub</mat-icon></div>
          <div>
            <div class="logo-text">CRM SaaS</div>
            <div class="logo-sub">Multi-Tenant</div>
          </div>
        </div>

        <!-- Nav -->
        <div class="nav-section">Main</div>
        <nav class="nav-list">
          <a class="nav-link" routerLink="/dashboard"   routerLinkActive="active">
            <mat-icon>dashboard</mat-icon> Dashboard
          </a>
          <a class="nav-link" routerLink="/customers"   routerLinkActive="active">
            <mat-icon>people</mat-icon> Customers
          </a>
          <a class="nav-link" routerLink="/deals"       routerLinkActive="active">
            <mat-icon>handshake</mat-icon> Deals
          </a>
          <a class="nav-link" routerLink="/activities"  routerLinkActive="active">
            <mat-icon>event_note</mat-icon> Activities
          </a>
        </nav>

        <!-- Footer -->
        <div class="sidenav-footer">
          <button class="logout-btn" type="button" (click)="logout()">
            <mat-icon>logout</mat-icon> Sign out
          </button>
        </div>

      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar class="toolbar">
          <span style="font-size:15px;font-weight:600;color:#1e293b">Multi-Tenant CRM</span>
          <span class="toolbar-spacer"></span>

          @if (activeTenant) {
            <div class="tenant-chip">
              <mat-icon>business</mat-icon>{{ activeTenant.name }}
            </div>
          }
          @if (currentUser) {
            <div class="user-info">
              <mat-icon>account_circle</mat-icon>{{ currentUser.email }}
            </div>
          }
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

  get activeTenant() { return this.authService.getActiveTenant(); }
  get currentUser()  { return this.authService.getCurrentUser(); }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/auth/login']);
  }
}
