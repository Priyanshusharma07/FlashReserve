import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GetTokenDto {
  @ApiProperty({
    example: 'user_1001',
    description: 'Unique user or admin identifier',
    default: 'user_1001',
  })
  @IsString()
  @IsNotEmpty()
  userId: string = 'user_1001';

  @ApiProperty({
    example: 'user',
    enum: ['user', 'admin'],
    description: 'Role of the subject. Use "admin" for campaign creation/activation, "user" for reservations.',
    default: 'user',
    required: false,
  })
  @IsEnum(['user', 'admin'])
  @IsOptional()
  role: 'user' | 'admin' = 'user';
}

export class TokenResponseDto {
  @ApiProperty({
    example: 'dev-user-user_1001',
    description: 'Bearer token to copy into the Swagger "Authorize" dialog',
  })
  accessToken: string;

  @ApiProperty({ example: 'Bearer', description: 'Authorization scheme' })
  tokenType: string;

  @ApiProperty({ example: 'user_1001', description: 'Subject user ID' })
  userId: string;

  @ApiProperty({ example: 'user', description: 'Subject role' })
  role: 'user' | 'admin';
}
