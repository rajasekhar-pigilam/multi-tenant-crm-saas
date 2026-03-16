export interface Customer {
  id: number;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  createdAt: string;
}

export interface Deal {
  id: number;
  title: string;
  value: number;
  stage: string;
  customerId: number;
  createdAt: string;
  customer?: Customer;
}

export interface Activity {
  id: number;
  type: string;
  notes?: string;
  customerId: number;
  createdAt: string;
  customer?: Customer;
}

export interface DashboardSummary {
  totalCustomers: number;
  activeDeals: number;
  revenuePipeline: number;
  deals: Deal[];
  recentActivities: Activity[];
}
