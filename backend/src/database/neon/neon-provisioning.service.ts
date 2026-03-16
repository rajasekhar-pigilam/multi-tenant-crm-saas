import {
  Injectable,
  InternalServerErrorException,
  Logger
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface NeonBranch {
  id: string;
  name: string;
  default: boolean;
}

interface NeonDatabase {
  name: string;
  owner_name: string;
}

/**
 * Wraps the Neon REST API v2 for programmatic database provisioning.
 * Reference: https://api.neon.tech/v2 (OpenAPI spec)
 */
@Injectable()
export class NeonProvisioningService {
  private readonly logger = new Logger(NeonProvisioningService.name);
  private readonly neonApiBase = 'https://console.neon.tech/api/v2';

  private readonly apiKey: string;
  private readonly projectId: string;
  private readonly dbOwner: string;
  private readonly dbTemplate: string;
  private readonly masterDbUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('database.neon.apiKey', '');
    this.projectId = this.configService.get<string>(
      'database.neon.projectId',
      ''
    );
    this.dbOwner = this.configService.get<string>(
      'database.neon.dbOwner',
      'neondb_owner'
    );
    this.dbTemplate = this.configService.get<string>(
      'database.neon.dbTemplate',
      'crm_tenant_{slug}_db'
    );
    this.masterDbUrl = this.configService.get<string>(
      'database.masterDbUrl',
      ''
    );
  }

  /**
   * Creates a new Neon database for the given tenant slug.
   * Returns the connection string for the new database.
   */
  async createTenantDatabase(slug: string): Promise<string> {
    if (!this.apiKey || !this.projectId) {
      throw new InternalServerErrorException(
        'NEON_API_KEY and NEON_PROJECT_ID must be configured for tenant provisioning'
      );
    }

    const dbName = this.dbTemplate.replace('{slug}', slug);

    const branchId = await this.getDefaultBranchId();
    this.logger.log(
      `Creating Neon database "${dbName}" on branch "${branchId}"`
    );

    await this.callNeonApi<{ database: NeonDatabase }>(
      'POST',
      `/projects/${this.projectId}/branches/${branchId}/databases`,
      { database: { name: dbName, owner_name: this.dbOwner } }
    );

    const connectionString = this.buildConnectionString(dbName);
    this.logger.log(`Database "${dbName}" created successfully`);
    return connectionString;
  }

  /**
   * Deletes the Neon database for a given slug (used on provisioning failure).
   */
  async deleteTenantDatabase(slug: string): Promise<void> {
    if (!this.apiKey || !this.projectId) return;

    const dbName = this.dbTemplate.replace('{slug}', slug);
    try {
      const branchId = await this.getDefaultBranchId();
      await this.callNeonApi(
        'DELETE',
        `/projects/${this.projectId}/branches/${branchId}/databases/${dbName}`
      );
      this.logger.log(`Database "${dbName}" deleted during rollback`);
    } catch (err) {
      this.logger.warn(`Could not delete database "${dbName}" during rollback`, err);
    }
  }

  /**
   * Lists branches for the project and returns the ID of the default one.
   * The project endpoint does not expose default_branch_id directly.
   * Reference: https://api.neon.tech/v2 — GET /projects/{project_id}/branches
   */
  private async getDefaultBranchId(): Promise<string> {
    const data = await this.callNeonApi<{ branches: NeonBranch[] }>(
      'GET',
      `/projects/${this.projectId}/branches`
    );

    const defaultBranch = data.branches.find(b => b.default);
    if (!defaultBranch) {
      throw new InternalServerErrorException(
        `No default branch found in Neon project ${this.projectId}`
      );
    }

    return defaultBranch.id;
  }

  /**
   * Derives the connection string for a new database from the MASTER_DB_URL
   * by replacing only the database name segment in the path.
   */
  private buildConnectionString(dbName: string): string {
    const url = new URL(this.masterDbUrl);
    url.pathname = `/${dbName}`;
    return url.toString();
  }

  private async callNeonApi<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.neonApiBase}${path}`;
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new InternalServerErrorException(
        `Neon API error ${response.status} on ${method} ${path}: ${text}`
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }
}
