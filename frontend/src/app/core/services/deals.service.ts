import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Deal } from '../../shared/models/crm.models';

@Injectable({
  providedIn: 'root'
})
export class DealsService {
  private readonly http = inject(HttpClient);

  list(): Observable<Deal[]> {
    return this.http.get<Deal[]>(`${environment.apiBaseUrl}/deals`);
  }

  create(payload: {
    title: string;
    value: number;
    stage: string;
    customerId: number;
  }): Observable<Deal> {
    return this.http.post<Deal>(`${environment.apiBaseUrl}/deals`, payload);
  }
}
