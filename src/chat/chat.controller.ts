import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentContext } from '../common/request-context.decorator.js';
import type { RequestContext } from '../common/request-context.js';
import { ChatRequestDto } from './chat.dto.js';
import { ChatService } from './chat.service.js';

@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('chat')
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
        response: res,
        abortSignal: abortController.signal,
      });
    } finally {
      req.off('close', onClose);
    }
  }

  @Get('conversations/:id')
  async getConversation(@Param('id') id: string) {
    return this.chatService.loadConversation(id);
  }
}
