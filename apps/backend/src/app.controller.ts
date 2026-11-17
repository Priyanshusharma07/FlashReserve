import { Controller, Get, HttpCode, HttpStatus, Redirect } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';

@Controller()
export class AppController {
  @Get()
  @Redirect('/api', HttpStatus.FOUND)
  @ApiExcludeEndpoint()
  root(): void {}

  @Get('docs')
  @Redirect('/api', HttpStatus.FOUND)
  @ApiExcludeEndpoint()
  docs(): void {}

  @Get('api/docs')
  @Redirect('/api', HttpStatus.FOUND)
  @ApiExcludeEndpoint()
  apiDocs(): void {}

  @Get('favicon.ico')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiExcludeEndpoint()
  favicon(): void {}
}
