import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({
    summary: 'Liveness check',
    description:
      'Returns ok when the HTTP process is up. Does not verify LLM provider reachability.',
  })
  @ApiOkResponse({
    description: 'Process is accepting requests.',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
      },
    },
  })
  check() {
    return { status: 'ok' };
  }
}
