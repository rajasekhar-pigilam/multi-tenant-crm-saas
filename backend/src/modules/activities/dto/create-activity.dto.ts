import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateActivityDto {
  @ApiProperty({ example: 'CALL' })
  @IsString()
  @MaxLength(40)
  type!: string;

  @ApiProperty({
    example: 'Followed up with the customer about contract renewal.',
    required: false
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  customerId!: number;
}
