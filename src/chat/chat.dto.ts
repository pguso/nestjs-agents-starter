import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';
import type { UIMessage } from 'ai';

/**
 * Lightweight OpenAPI shape for an AI SDK UIMessage.
 * Runtime validation stays shallow (`@IsArray`); the AI SDK owns deep message shape.
 */
export class UiMessagePartDto {
  @ApiProperty({
    example: 'text',
    description: 'Part type, e.g. `text` or a tool part type.',
  })
  type!: string;

  @ApiPropertyOptional({
    example: 'What can you do?',
    description: 'Present when `type` is `text`.',
  })
  text?: string;
}

export class UiMessageDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: 'user', enum: ['user', 'assistant', 'system'] })
  role!: string;

  @ApiProperty({ type: [UiMessagePartDto] })
  parts!: UiMessagePartDto[];
}

export class ChatRequestDto {
  @ApiProperty({
    type: [UiMessageDto],
    description: 'AI SDK UI messages for the turn (full conversation so far).',
  })
  @IsArray()
  messages!: UIMessage[];

  @ApiPropertyOptional({
    description:
      'When set, the final messages from the stream are saved under this id.',
    example: 'conv_123',
  })
  @IsOptional()
  @IsString()
  conversationId?: string;
}
