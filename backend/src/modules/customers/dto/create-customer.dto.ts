import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Acme Industries' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'buyer@acme.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '+1-202-555-0111', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiProperty({ example: 'Acme Corp', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  company?: string;

  @ApiProperty({
    example: 'US',
    required: false,
    description: 'ISO-2 country code. Must exist in the tenant countries table with is_active = true.'
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  countryCode?: string;
}
