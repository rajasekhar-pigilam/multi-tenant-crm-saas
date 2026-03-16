import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength
} from 'class-validator';

export class RegisterTenantDto {
  @ApiProperty({ example: 'Acme Corporation', description: 'Display name for the tenant' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  tenantName!: string;

  @ApiProperty({
    example: 'acme',
    description:
      'URL-friendly slug used as the database name suffix (lowercase, letters, digits, hyphens only)'
  })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug must contain only lowercase letters, digits, and hyphens'
  })
  @MinLength(2)
  @MaxLength(40)
  slug!: string;

  @ApiProperty({ example: 'admin@acme.com', description: 'Email of the initial admin user' })
  @IsEmail()
  adminEmail!: string;

  @ApiProperty({ example: 'S3cur3Pass!', description: 'Password for the initial admin user' })
  @IsString()
  @MinLength(8)
  adminPassword!: string;

  @ApiPropertyOptional({ example: 'Jane Doe', description: 'Optional display name for the admin' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  adminName?: string;
}
