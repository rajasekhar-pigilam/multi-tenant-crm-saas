import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LoginResponse,
  SelectTenantResponse,
  WorkspaceTenant,
  WorkspaceUser
} from '../../shared/models/auth.models';

interface SessionState {
  user: WorkspaceUser | null;
  tenants: WorkspaceTenant[];
  selectionToken: string | null;
  accessToken: string | null;
  activeTenant: WorkspaceTenant | null;
}

const STORAGE_KEY = 'crm-saas-session';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly sessionSubject = new BehaviorSubject<SessionState>(
    this.loadSession()
  );

  readonly session$ = this.sessionSubject.asObservable();

  login(payload: { email: string; password: string }): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiBaseUrl}/auth/login`, payload)
      .pipe(
        tap(response => {
          const nextState: SessionState = {
            user: response.user,
            tenants: response.tenants,
            selectionToken: response.selectionToken,
            accessToken: null,
            activeTenant: null
          };
          this.updateSession(nextState);
        })
      );
  }

  selectTenant(tenantId: number): Observable<SelectTenantResponse> {
    return this.http
      .post<SelectTenantResponse>(`${environment.apiBaseUrl}/auth/select-tenant`, {
        tenantId
      })
      .pipe(
        tap(response => {
          const current = this.sessionSubject.value;
          const nextState: SessionState = {
            user: response.user,
            tenants: current.tenants,
            selectionToken: null,
            accessToken: response.accessToken,
            activeTenant: response.tenant
          };
          this.updateSession(nextState);
        })
      );
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.sessionSubject.next({
      user: null,
      tenants: [],
      selectionToken: null,
      accessToken: null,
      activeTenant: null
    });
  }

  getAuthorizationToken(): string | null {
    const session = this.sessionSubject.value;
    return session.accessToken ?? session.selectionToken;
  }

  hasAccessToken(): boolean {
    return Boolean(this.sessionSubject.value.accessToken);
  }

  hasPendingWorkspaceSelection(): boolean {
    const session = this.sessionSubject.value;
    return Boolean(session.selectionToken && session.tenants.length);
  }

  getActiveTenant(): WorkspaceTenant | null {
    return this.sessionSubject.value.activeTenant;
  }

  getAvailableTenants(): WorkspaceTenant[] {
    return this.sessionSubject.value.tenants;
  }

  getCurrentUser(): WorkspaceUser | null {
    return this.sessionSubject.value.user;
  }

  private updateSession(nextState: SessionState): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    this.sessionSubject.next(nextState);
  }

  private loadSession(): SessionState {
    const storedValue = localStorage.getItem(STORAGE_KEY);
    if (!storedValue) {
      return {
        user: null,
        tenants: [],
        selectionToken: null,
        accessToken: null,
        activeTenant: null
      };
    }

    try {
      return JSON.parse(storedValue) as SessionState;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return {
        user: null,
        tenants: [],
        selectionToken: null,
        accessToken: null,
        activeTenant: null
      };
    }
  }
}
