import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, Max, Min } from 'class-validator';

export class ReserveDto {
  @ApiProperty({
    example: 1,
    description: 'Number of units to reserve (positive integer up to max limit)',
    default: 1,
  })
  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(5)
  quantity: number = 1;
}
