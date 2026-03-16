import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { ActivitiesService } from '../../core/services/activities.service';
import { CustomersService } from '../../core/services/customers.service';
import { Activity, Customer } from '../../shared/models/crm.models';

@Component({
  selector: 'crm-activities',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatTableModule
  ],
  template: `
    <div class="grid grid-3">
      <mat-card>
        <mat-card-title>Create Activity</mat-card-title>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()" class="grid">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Type</mat-label>
              <mat-select formControlName="type">
                <mat-option value="CALL">Call</mat-option>
                <mat-option value="EMAIL">Email</mat-option>
                <mat-option value="MEETING">Meeting</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Customer</mat-label>
              <mat-select formControlName="customerId">
                <mat-option *ngFor="let customer of customers" [value]="customer.id">
                  {{ customer.name }}
                </mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Notes</mat-label>
              <textarea matInput rows="4" formControlName="notes"></textarea>
            </mat-form-field>
            <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">
              Save Activity
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <mat-card style="grid-column: span 2">
        <mat-card-title>Activities</mat-card-title>
        <mat-card-content>
          <table mat-table [dataSource]="activities">
            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef>Type</th>
              <td mat-cell *matCellDef="let item">{{ item.type }}</td>
            </ng-container>
            <ng-container matColumnDef="customer">
              <th mat-header-cell *matHeaderCellDef>Customer</th>
              <td mat-cell *matCellDef="let item">{{ item.customer?.name || '-' }}</td>
            </ng-container>
            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>Created</th>
              <td mat-cell *matCellDef="let item">{{ item.createdAt | date: 'short' }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
          </table>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class ActivitiesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly activitiesService = inject(ActivitiesService);
  private readonly customersService = inject(CustomersService);

  protected activities: Activity[] = [];
  protected customers: Customer[] = [];
  protected readonly columns = ['type', 'customer', 'createdAt'];
  protected readonly form = this.fb.nonNullable.group({
    type: ['CALL', Validators.required],
    customerId: [0, Validators.min(1)],
    notes: ['']
  });

  ngOnInit(): void {
    this.loadCustomers();
    this.loadActivities();
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    this.activitiesService.create(this.form.getRawValue()).subscribe(() => {
      this.form.patchValue({
        type: 'CALL',
        notes: ''
      });
      this.loadActivities();
    });
  }

  private loadActivities(): void {
    this.activitiesService.list().subscribe(activities => {
      this.activities = activities;
    });
  }

  private loadCustomers(): void {
    this.customersService.list().subscribe(customers => {
      this.customers = customers;
      const [firstCustomer] = customers;
      if (firstCustomer && !this.form.value.customerId) {
        this.form.patchValue({ customerId: firstCustomer.id });
      }
    });
  }
}
