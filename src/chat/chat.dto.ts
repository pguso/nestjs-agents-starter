import { IsArray, IsOptional, IsString } from 'class-validator';
import type { UIMessage } from 'ai';

export class ChatRequestDto {
  @IsArray()
  messages!: UIMessage[];

  @IsOptional()
  @IsString()
  conversationId?: string;
}
