import { Node as BaseNode, Request, Text, Trace } from '@voiceflow/base-types';
import { Node as ChatNode } from '@voiceflow/chat-types';
import { Node as VoiceNode } from '@voiceflow/voice-types';
import _ from 'lodash';

import { Runtime, Store } from '@/runtime';

import { NoMatchCounterStorage, StorageType } from '../types';
import { addButtonsIfExists, outputTrace, removeEmptyPrompts } from '../utils';
import { addNoReplyTimeoutIfExists } from './noReply';

export type NoMatchNode = Request.NodeButton & (VoiceNode.Utils.NoMatchNode | ChatNode.Utils.NoMatchNode);

const utilsObj = {
  outputTrace,
  addButtonsIfExists,
  addNoReplyTimeoutIfExists,
};

const convertDeprecatedNoMatch = ({ noMatch, elseId, noMatches, randomize, ...node }: NoMatchNode) =>
  ({
    noMatch: {
      prompts: noMatch?.prompts ?? noMatches,
      randomize: noMatch?.randomize ?? randomize,
      nodeID: noMatch?.nodeID ?? elseId,
    },
    ...node,
  } as NoMatchNode);

const removeEmptyNoMatches = (node: NoMatchNode) => {
  const prompts: Array<Text.SlateTextValue | string> = node.noMatch?.prompts ?? [];

  return removeEmptyPrompts(prompts);
};

export const NoMatchHandler = (utils: typeof utilsObj) => ({
  handle: (_node: NoMatchNode, runtime: Runtime, variables: Store) => {
    const node = convertDeprecatedNoMatch(_node);

    const nonEmptyNoMatches = removeEmptyNoMatches(node);

    const noMatchCounter = runtime.storage.get<NoMatchCounterStorage>(StorageType.NO_MATCHES_COUNTER) ?? 0;

    if (noMatchCounter >= nonEmptyNoMatches.length) {
      // clean up no matches counter
      runtime.storage.delete(StorageType.NO_MATCHES_COUNTER);

      runtime.trace.addTrace<Trace.PathTrace>({
        type: BaseNode.Utils.TraceType.PATH,
        payload: { path: 'choice:else' },
      });

      return node.noMatch?.nodeID ?? null;
    }

    runtime.trace.addTrace<Trace.PathTrace>({
      type: BaseNode.Utils.TraceType.PATH,
      payload: { path: 'reprompt' },
    });

    const output = node.noMatch?.randomize ? _.sample<string | Text.SlateTextValue>(nonEmptyNoMatches) : nonEmptyNoMatches?.[noMatchCounter];

    runtime.storage.set(StorageType.NO_MATCHES_COUNTER, noMatchCounter + 1);

    runtime.trace.addTrace(utils.outputTrace({ output, variables: variables.getState() }));

    utils.addButtonsIfExists(node, runtime, variables);
    utils.addNoReplyTimeoutIfExists(node, runtime);

    return node.id;
  },
});

export default () => NoMatchHandler(utilsObj);
