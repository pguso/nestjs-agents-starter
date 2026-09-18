import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentContext } from '../common/request-context.decorator.js';
import type { RequestContext } from '../common/request-context.js';
import { ChatRequestDto, UiMessageDto } from './chat.dto.js';
import { ChatService } from './chat.service.js';

@ApiTags('chat')
@ApiSecurity('x-user-id')
@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('chat')
  @ApiOperation({
    summary: 'Stream a chat turn with the assistant agent',
    description: [
      'Streams the AI SDK UI message protocol via `pipeAgentUIStreamToResponse`.',
      'Swagger Try it out cannot usefully play this stream - use curl (`curl -N`) or a React `useChat` transport pointed at this URL.',
      'Optional `conversationId` persists the finished message list through `ConversationStore` (scoped to the current user).',
      'Optional `agentId` selects an agent from `AgentRegistry` (default `assistant`).',
    ].join(' '),
  })
  @ApiBody({ type: ChatRequestDto })
  @ApiProduces('text/plain')
  async chat(
    @Body() body: ChatRequestDto,
    @CurrentContext() ctx: RequestContext,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const abortController = new AbortController();
    const onClose = () => abortController.abort();
    req.on('close', onClose);

    try {
      await this.chatService.streamChat({
        ctx,
        messages: body.messages,
        conversationId: body.conversationId,
        agentId: body.agentId,
        response: res,
        abortSignal: abortController.signal,
      });
    } finally {
      req.off('close', onClose);
    }
  }

  @Get('conversations/:id')
  @ApiOperation({
    summary: 'Load a stored conversation',
    description:
      'Returns the message list saved for `id` for the current user (from `x-user-id`), or an empty array if nothing was stored. Suitable for Swagger Try it out.',
  })
  @ApiParam({ name: 'id', example: 'conv_123' })
  @ApiOkResponse({
    description: 'Stored AI SDK UI messages (empty array when missing).',
    type: [UiMessageDto],
  })
  async getConversation(
    @Param('id') id: string,
    @CurrentContext() ctx: RequestContext,
  ) {
    return this.chatService.loadConversation(ctx.userId, id);
  }
}
