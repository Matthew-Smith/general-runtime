/**
 * [[include:filter.md]]
 * @packageDocumentation
 */

import { Node } from '@voiceflow/base-types';

import { Context, ContextHandler } from '@/types';

import { AbstractManager, injectServices } from '../utils';
import { sanitizeSSML } from './utils';

export const utils = {
  sanitizeSSML,
};

@injectServices({ utils })
class Filter extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  handle(context: Context) {
    const {
      data: { config = {} },
    } = context;

    let traces = context.trace || [];

    const excludeTypes = config.excludeTypes || [Node.Utils.TraceType.BLOCK, Node.Utils.TraceType.DEBUG, Node.Utils.TraceType.FLOW];
    traces = traces.filter((trace) => !excludeTypes.includes(trace.type));

    if (config.stripSSML !== false) {
      traces = traces?.map((trace) =>
        !(
          trace.type === Node.Utils.TraceType.SPEAK &&
          (trace.payload.type === Node.Speak.TraceSpeakType.MESSAGE || trace.payload.type === Node.Speak.TraceSpeakType.AUDIO)
        )
          ? trace
          : {
              ...trace,
              payload: {
                ...trace.payload,
                message: this.services.utils.sanitizeSSML(trace.payload.message),
              },
            }
      );
    }

    return {
      ...context,
      trace: traces,
    };
  }
}

export default Filter;
