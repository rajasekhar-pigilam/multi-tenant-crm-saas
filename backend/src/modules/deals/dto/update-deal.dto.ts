import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDecimal,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min
} from 'class-validator';

export class UpdateDealDto {
  @ApiPropertyOptional({ example: 'Revised Enterprise Contract' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: '9999.99' })
  @IsOptional()
  @IsDecimal()
  value?: string;

  @ApiPropertyOptional({ example: 'NEGOTIATION', description: 'Deal stage' })
  @IsOptional()
  @IsString()
  stage?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  customerId?: number;
}
