import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { forkJoin } from 'rxjs';
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
  imports: [CommonModule, MatCardModule, MatTableModule, CurrencyPipe, DatePipe],
  template: `
    <section class="grid grid-4">
      <mat-card>
        <mat-card-title>Total Customers</mat-card-title>
        <mat-card-content style="font-size: 32px">{{ summary.totalCustomers }}</mat-card-content>
      </mat-card>
      <mat-card>
        <mat-card-title>Active Deals</mat-card-title>
        <mat-card-content style="font-size: 32px">{{ summary.activeDeals }}</mat-card-content>
      </mat-card>
      <mat-card>
        <mat-card-title>Revenue Pipeline</mat-card-title>
        <mat-card-content style="font-size: 32px">
          {{ summary.revenuePipeline | currency }}
        </mat-card-content>
      </mat-card>
      <mat-card>
        <mat-card-title>Recent Activities</mat-card-title>
        <mat-card-content style="font-size: 32px">{{ activities.length }}</mat-card-content>
      </mat-card>
    </section>

    <section class="grid grid-3" style="margin-top: 24px">
      <mat-card>
        <mat-card-title>Customers</mat-card-title>
        <mat-card-content>
          <table mat-table [dataSource]="customers">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let item">{{ item.name }}</td>
            </ng-container>
            <ng-container matColumnDef="company">
              <th mat-header-cell *matHeaderCellDef>Company</th>
              <td mat-cell *matCellDef="let item">{{ item.company || '-' }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="customerColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: customerColumns"></tr>
          </table>
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-title>Deals</mat-card-title>
        <mat-card-content>
          <table mat-table [dataSource]="deals">
            <ng-container matColumnDef="title">
              <th mat-header-cell *matHeaderCellDef>Title</th>
              <td mat-cell *matCellDef="let item">{{ item.title }}</td>
            </ng-container>
            <ng-container matColumnDef="value">
              <th mat-header-cell *matHeaderCellDef>Value</th>
              <td mat-cell *matCellDef="let item">{{ item.value | currency }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="dealColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: dealColumns"></tr>
          </table>
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-title>Activities</mat-card-title>
        <mat-card-content>
          <table mat-table [dataSource]="activities">
            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef>Type</th>
              <td mat-cell *matCellDef="let item">{{ item.type }}</td>
            </ng-container>
            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>Created</th>
              <td mat-cell *matCellDef="let item">{{ item.createdAt | date: 'short' }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="activityColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: activityColumns"></tr>
          </table>
        </mat-card-content>
      </mat-card>
    </section>
  `
})
export class DashboardComponent implements OnInit {
  private readonly tenantService = inject(TenantService);
  private readonly customersService = inject(CustomersService);
  private readonly dealsService = inject(DealsService);
  private readonly activitiesService = inject(ActivitiesService);

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
    }).subscribe(response => {
      this.summary = response.summary;
      this.customers = response.customers;
      this.deals = response.deals;
      this.activities = response.activities;
    });
  }
}
