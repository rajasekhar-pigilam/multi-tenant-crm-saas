import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Customer } from '../../shared/models/crm.models';

@Injectable({
  providedIn: 'root'
})
export class CustomersService {
  private readonly http = inject(HttpClient);

  list(): Observable<Customer[]> {
    return this.http.get<Customer[]>(`${environment.apiBaseUrl}/customers`);
  }

  create(payload: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    countryCode?: string;
  }): Observable<Customer> {
    return this.http.post<Customer>(`${environment.apiBaseUrl}/customers`, payload);
  }
}
