export interface AuthenticatedUser {
  sub: number;
  email: string;
  tenantId?: number;
  role?: string;
  tokenType: 'workspace-select' | 'access';
}
