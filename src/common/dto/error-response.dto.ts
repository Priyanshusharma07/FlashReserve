import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 400, description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({ example: 'Bad Request', description: 'HTTP error title' })
  error: string;

  @ApiProperty({
    example: 'Quantity must be a positive integer',
    description: 'Detailed error message or validation errors array',
  })
  message: string | string[];

  @ApiProperty({
    example: '01HNG58J2A9ZX7',
    description: 'Unique correlation ID for tracing the request',
  })
  correlationId: string;

  @ApiProperty({
    example: '2026-10-24T17:30:00.000Z',
    description: 'ISO 8601 timestamp of when the error occurred',
  })
  timestamp: string;
}
