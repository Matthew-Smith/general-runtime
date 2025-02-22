import { Node } from '@voiceflow/base-types';

import { State } from '@/runtime/lib/Runtime';

export type Context<R = Record<string, unknown>, T = Node.Utils.BaseTraceFrame, D = Record<string, unknown>> = {
  end?: boolean;
  data: D;
  state: Omit<State, 'trace'>;
  trace?: T[];
  userID?: string;
  request: R;
  versionID: string;
};

export type ContextHandle<C extends Context<any, any, any>> = (request: C) => C | Promise<C>;

export interface ContextHandler<C extends Context<any, any, any>> {
  handle: ContextHandle<C>;
}

// for request handlers that generate the runtime
export type PartialContext<C extends Context<any, any, any>> = Omit<Partial<C>, 'data'> & { data?: Partial<C['data']> };
export type InitContextHandle<C extends Context<any, any, any>> = (params: PartialContext<C>) => C | Promise<C>;

export interface InitContextHandler<C extends Context<any, any, any>> {
  handle: InitContextHandle<C>;
}
