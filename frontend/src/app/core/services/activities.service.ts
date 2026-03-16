import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Activity } from '../../shared/models/crm.models';

@Injectable({
  providedIn: 'root'
})
export class ActivitiesService {
  private readonly http = inject(HttpClient);

  list(): Observable<Activity[]> {
    return this.http.get<Activity[]>(`${environment.apiBaseUrl}/activities`);
  }

  create(payload: {
    type: string;
    notes?: string;
    customerId: number;
  }): Observable<Activity> {
    return this.http.post<Activity>(
      `${environment.apiBaseUrl}/activities`,
      payload
    );
  }
}
