import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsString, MaxLength, Min } from 'class-validator';

export class CreateDealDto {
  @ApiProperty({ example: 'Enterprise Renewal' })
  @IsString()
  @MaxLength(120)
  title!: string;

  @ApiProperty({ example: 25000 })
  @IsNumber()
  @Min(0)
  value!: number;

  @ApiProperty({ example: 'NEGOTIATION' })
  @IsString()
  @MaxLength(40)
  stage!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  customerId!: number;
}
