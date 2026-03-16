import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { MembershipRole } from '../../../generated/master-client';

export class AddMemberDto {
  @ApiProperty({ example: 'newuser@acme.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ enum: MembershipRole, default: MembershipRole.MEMBER })
  @IsOptional()
  @IsEnum(MembershipRole)
  role?: MembershipRole;
}
