export interface WorkspaceUser {
  id: number;
  email: string;
  status?: string;
  role?: string;
}

export interface WorkspaceTenant {
  id: number;
  name: string;
  role?: string;
}

export interface LoginResponse {
  user: WorkspaceUser;
  tenants: WorkspaceTenant[];
  selectionToken: string;
}

export interface SelectTenantResponse {
  accessToken: string;
  expiresIn: string;
  tenant: WorkspaceTenant;
  user: WorkspaceUser;
}
