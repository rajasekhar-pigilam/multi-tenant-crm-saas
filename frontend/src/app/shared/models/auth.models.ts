export interface WorkspaceUser {
  id: number;
  email: string;
  status?: string;
  role?: string;
}

export interface WorkspaceTenant {
  id: number;
  name: string;
  slug?: string;
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

export interface RegisterTenantRequest {
  tenantName: string;
  slug: string;
  adminEmail: string;
  adminPassword: string;
}

export interface RegisterTenantResponse {
  tenant: {
    id: number;
    name: string;
    slug: string;
    status: string;
    createdAt: string;
  };
  admin: {
    id: number;
    email: string;
  };
  message: string;
}
