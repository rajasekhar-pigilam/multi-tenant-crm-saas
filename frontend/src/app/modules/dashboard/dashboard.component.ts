import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ActivitiesService } from '../../core/services/activities.service';
import { CustomersService } from '../../core/services/customers.service';
import { DealsService } from '../../core/services/deals.service';
import { TenantService } from '../../core/services/tenant.service';
import {
  Activity,
  Customer,
  DashboardSummary,
  Deal
} from '../../shared/models/crm.models';

@Component({
  selector: 'crm-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatProgressSpinnerModule,
    CurrencyPipe,
    DatePipe
  ],
  styles: [`
    .stat-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .stat-card {
      background: #fff;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .stat-icon mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1;
    }
    .stat-label {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .tables-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      margin-top: 24px;
    }
    .section-card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    .section-header {
      padding: 16px 20px 12px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
    }
    .section-header mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #64748b;
    }
    table.mat-mdc-table {
      width: 100%;
    }
    .empty-state {
      text-align: center;
      padding: 32px 16px;
      color: #94a3b8;
      font-size: 13px;
    }
    .empty-state mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      margin-bottom: 8px;
      display: block;
      margin-left: auto;
      margin-right: auto;
    }
    .stage-chip {
      display: inline-flex;
      align-items: center;
      border-radius: 4px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .loading-center {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 64px 0;
    }
  `],
  template: `
    @if (loading) {
      <div class="loading-center"><mat-spinner diameter="48" /></div>
    } @else {
      <!-- ── Stat Cards ── -->
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-icon" style="background:#eff6ff"><mat-icon style="color:#3b82f6">people</mat-icon></div>
          <div><div class="stat-value">{{ summary.totalCustomers }}</div><div class="stat-label">Total Customers</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#f0fdf4"><mat-icon style="color:#22c55e">handshake</mat-icon></div>
          <div><div class="stat-value">{{ summary.activeDeals }}</div><div class="stat-label">Active Deals</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#fefce8"><mat-icon style="color:#eab308">attach_money</mat-icon></div>
          <div><div class="stat-value">{{ summary.revenuePipeline | currency: 'USD':'symbol':'1.0-0' }}</div><div class="stat-label">Revenue Pipeline</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#fdf4ff"><mat-icon style="color:#a855f7">event_note</mat-icon></div>
          <div><div class="stat-value">{{ activities.length }}</div><div class="stat-label">Recent Activities</div></div>
        </div>
      </div>

      <!-- ── Data Tables ── -->
      <div class="tables-row">
        <div class="section-card">
          <div class="section-header"><mat-icon>people</mat-icon><span class="section-title">Customers</span></div>
          @if (customers.length === 0) {
            <div class="empty-state"><mat-icon>people_outline</mat-icon> No customers yet</div>
          } @else {
            <table mat-table [dataSource]="customers">
              <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Name</th><td mat-cell *matCellDef="let item">{{ item.name }}</td></ng-container>
              <ng-container matColumnDef="company"><th mat-header-cell *matHeaderCellDef>Company</th><td mat-cell *matCellDef="let item">{{ item.company || '—' }}</td></ng-container>
              <tr mat-header-row *matHeaderRowDef="customerColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: customerColumns"></tr>
            </table>
          }
        </div>
        <div class="section-card">
          <div class="section-header"><mat-icon>handshake</mat-icon><span class="section-title">Deals</span></div>
          @if (deals.length === 0) {
            <div class="empty-state"><mat-icon>handshake</mat-icon> No deals yet</div>
          } @else {
            <table mat-table [dataSource]="deals">
              <ng-container matColumnDef="title"><th mat-header-cell *matHeaderCellDef>Title</th><td mat-cell *matCellDef="let item">{{ item.title }}</td></ng-container>
              <ng-container matColumnDef="value"><th mat-header-cell *matHeaderCellDef>Value</th><td mat-cell *matCellDef="let item">{{ item.value | currency }}</td></ng-container>
              <tr mat-header-row *matHeaderRowDef="dealColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: dealColumns"></tr>
            </table>
          }
        </div>
        <div class="section-card">
          <div class="section-header"><mat-icon>event_note</mat-icon><span class="section-title">Recent Activities</span></div>
          @if (activities.length === 0) {
            <div class="empty-state"><mat-icon>event_note</mat-icon> No activities yet</div>
          } @else {
            <table mat-table [dataSource]="activities">
              <ng-container matColumnDef="type"><th mat-header-cell *matHeaderCellDef>Type</th><td mat-cell *matCellDef="let item">{{ item.type }}</td></ng-container>
              <ng-container matColumnDef="createdAt"><th mat-header-cell *matHeaderCellDef>When</th><td mat-cell *matCellDef="let item">{{ item.createdAt | date: 'MMM d, h:mm a' }}</td></ng-container>
              <tr mat-header-row *matHeaderRowDef="activityColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: activityColumns"></tr>
            </table>
          }
        </div>
      </div>
    }
  `
})
export class DashboardComponent implements OnInit {
  private readonly tenantService = inject(TenantService);
  private readonly customersService = inject(CustomersService);
  private readonly dealsService = inject(DealsService);
  private readonly activitiesService = inject(ActivitiesService);
  private readonly cd = inject(ChangeDetectorRef);

  protected loading = true;
  protected summary: DashboardSummary = {
    totalCustomers: 0,
    activeDeals: 0,
    revenuePipeline: 0,
    deals: [],
    recentActivities: []
  };
  protected customers: Customer[] = [];
  protected deals: Deal[] = [];
  protected activities: Activity[] = [];
  protected readonly customerColumns = ['name', 'company'];
  protected readonly dealColumns = ['title', 'value'];
  protected readonly activityColumns = ['type', 'createdAt'];

  ngOnInit(): void {
    forkJoin({
      summary: this.tenantService.getDashboard(),
      customers: this.customersService.list(),
      deals: this.dealsService.list(),
      activities: this.activitiesService.list()
    })
      .pipe(finalize(() => { this.loading = false; this.cd.markForCheck(); }))
      .subscribe({
        next: response => {
          this.summary = response.summary;
          this.customers = response.customers;
          this.deals = response.deals;
          this.activities = response.activities;
          this.cd.markForCheck();
        },
        error: () => {}
      });
  }
}
