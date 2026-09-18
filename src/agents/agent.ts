import type { LanguageModel } from 'ai';
import type { RequestContext } from '../common/request-context.js';

/**
 * Nest-backed agent: a stable id plus a per-request factory.
 * Register instances in {@link AgentRegistry}; chat looks them up by id.
 *
 * `create` is loosely typed because each `ToolLoopAgent` is generic over its
 * own tool map; the AI SDK stream helper accepts the concrete instance.
 */
export interface NestAgent {
  readonly id: string;
  // Tool maps differ per agent - avoid locking ToolLoopAgent generics into the registry.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create(ctx: RequestContext, model?: LanguageModel): any;
}
