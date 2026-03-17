import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Country } from '../../shared/models/crm.models';

@Injectable({
  providedIn: 'root'
})
export class CountriesService {
  private readonly http = inject(HttpClient);

  /** All countries for the tenant (active and inactive). Used in admin manage view. */
  list(): Observable<Country[]> {
    return this.http.get<Country[]>(`${environment.apiBaseUrl}/countries`);
  }

  /** Only active countries. Used in the customer form dropdown. */
  listActive(): Observable<Country[]> {
    return this.http.get<Country[]>(`${environment.apiBaseUrl}/countries/active`);
  }

  /** Toggle is_active for a country (ADMIN only). */
  toggle(code: string): Observable<Country> {
    return this.http.patch<Country>(
      `${environment.apiBaseUrl}/countries/${code}/toggle`,
      {}
    );
  }
}
