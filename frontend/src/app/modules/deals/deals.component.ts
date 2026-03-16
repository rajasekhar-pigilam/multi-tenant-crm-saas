import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { CustomersService } from '../../core/services/customers.service';
import { DealsService } from '../../core/services/deals.service';
import { Customer, Deal } from '../../shared/models/crm.models';

@Component({
  selector: 'crm-deals',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CurrencyPipe,
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
        <mat-card-title>Create Deal</mat-card-title>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()" class="grid">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Title</mat-label>
              <input matInput formControlName="title" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Value</mat-label>
              <input matInput type="number" formControlName="value" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Stage</mat-label>
              <mat-select formControlName="stage">
                <mat-option value="QUALIFICATION">Qualification</mat-option>
                <mat-option value="PROPOSAL">Proposal</mat-option>
                <mat-option value="NEGOTIATION">Negotiation</mat-option>
                <mat-option value="WON">Won</mat-option>
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
            <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">
              Save Deal
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <mat-card style="grid-column: span 2">
        <mat-card-title>Deals</mat-card-title>
        <mat-card-content>
          <table mat-table [dataSource]="deals">
            <ng-container matColumnDef="title">
              <th mat-header-cell *matHeaderCellDef>Title</th>
              <td mat-cell *matCellDef="let item">{{ item.title }}</td>
            </ng-container>
            <ng-container matColumnDef="customer">
              <th mat-header-cell *matHeaderCellDef>Customer</th>
              <td mat-cell *matCellDef="let item">{{ item.customer?.name || '-' }}</td>
            </ng-container>
            <ng-container matColumnDef="value">
              <th mat-header-cell *matHeaderCellDef>Value</th>
              <td mat-cell *matCellDef="let item">{{ item.value | currency }}</td>
            </ng-container>
            <ng-container matColumnDef="stage">
              <th mat-header-cell *matHeaderCellDef>Stage</th>
              <td mat-cell *matCellDef="let item">{{ item.stage }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
          </table>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class DealsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dealsService = inject(DealsService);
  private readonly customersService = inject(CustomersService);

  protected deals: Deal[] = [];
  protected customers: Customer[] = [];
  protected readonly columns = ['title', 'customer', 'value', 'stage'];
  protected readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    value: [0, Validators.min(0)],
    stage: ['QUALIFICATION', Validators.required],
    customerId: [0, Validators.min(1)]
  });

  ngOnInit(): void {
    this.loadCustomers();
    this.loadDeals();
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    this.dealsService.create(this.form.getRawValue()).subscribe(() => {
      this.form.patchValue({
        title: '',
        value: 0,
        stage: 'QUALIFICATION'
      });
      this.loadDeals();
    });
  }

  private loadDeals(): void {
    this.dealsService.list().subscribe(deals => {
      this.deals = deals;
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
