import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { CustomersService } from '../../core/services/customers.service';
import { Customer } from '../../shared/models/crm.models';

@Component({
  selector: 'crm-customers',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule
  ],
  template: `
    <div class="grid grid-3">
      <mat-card>
        <mat-card-title>Create Customer</mat-card-title>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()" class="grid">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Name</mat-label>
              <input matInput formControlName="name" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Phone</mat-label>
              <input matInput formControlName="phone" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Company</mat-label>
              <input matInput formControlName="company" />
            </mat-form-field>
            <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">
              Save Customer
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <mat-card style="grid-column: span 2">
        <mat-card-title>Customers</mat-card-title>
        <mat-card-content>
          <table mat-table [dataSource]="customers">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let item">{{ item.name }}</td>
            </ng-container>
            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef>Email</th>
              <td mat-cell *matCellDef="let item">{{ item.email }}</td>
            </ng-container>
            <ng-container matColumnDef="company">
              <th mat-header-cell *matHeaderCellDef>Company</th>
              <td mat-cell *matCellDef="let item">{{ item.company || '-' }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
          </table>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class CustomersComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly customersService = inject(CustomersService);

  protected customers: Customer[] = [];
  protected readonly columns = ['name', 'email', 'company'];
  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    company: ['']
  });

  ngOnInit(): void {
    this.loadCustomers();
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    this.customersService.create(this.form.getRawValue()).subscribe(() => {
      this.form.reset({
        name: '',
        email: '',
        phone: '',
        company: ''
      });
      this.loadCustomers();
    });
  }

  private loadCustomers(): void {
    this.customersService.list().subscribe(customers => {
      this.customers = customers;
    });
  }
}
