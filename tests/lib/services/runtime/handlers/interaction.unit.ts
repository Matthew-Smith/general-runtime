/* eslint-disable max-nested-callbacks */
import { Node } from '@voiceflow/base-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { InteractionHandler } from '@/lib/services/runtime/handlers/interaction';
import { StorageType } from '@/lib/services/runtime/types';
import { Action } from '@/runtime';

describe('Interaction handler', () => {
  describe('canHandle', () => {
    it('false', () => {
      expect(InteractionHandler(null as any).canHandle({} as any, null as any, null as any, null as any)).to.eql(false);
    });

    it('true', () => {
      expect(InteractionHandler(null as any).canHandle({ interactions: [] } as any, null as any, null as any, null as any)).to.eql(true);
    });
  });

  describe('handle', () => {
    describe('action is running', () => {
      it('buttons exist', () => {
        const utils = {
          addButtonsIfExists: sinon.stub(),
          addNoReplyTimeoutIfExists: sinon.stub(),
        };

        const node = { id: 'node-id' };
        const runtime = {
          getAction: sinon.stub().returns(Action.RUNNING),
          storage: { delete: sinon.stub() },
          getRequest: sinon.stub().returns({}),
        };
        const variables = { var1: 'val1' };
        const handler = InteractionHandler(utils as any);

        expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.id);
        expect(runtime.getAction.callCount).to.eql(1);
        expect(utils.addButtonsIfExists.args).to.eql([[node, runtime, variables]]);
        expect(runtime.storage.delete.args).to.eql([[StorageType.NO_MATCHES_COUNTER], [StorageType.NO_REPLIES_COUNTER]]);
      });

      it('no buttons', () => {
        const utils = {
          addButtonsIfExists: sinon.stub(),
          addNoReplyTimeoutIfExists: sinon.stub(),
        };

        const node = {
          id: 'node-id',
          interactions: [{}, { event: { type: 'random' } }, { event: { type: Node.Utils.EventType.INTENT, intent: 'intent-name' } }],
        };
        const runtime = {
          getAction: sinon.stub().returns(Action.RUNNING),
          getRequest: sinon.stub().returns({}),
          storage: { delete: sinon.stub() },
          trace: { addTrace: sinon.stub() },
        };
        const variables = { var1: 'val1' };
        const handler = InteractionHandler(utils as any);

        expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.id);
        expect(runtime.getAction.callCount).to.eql(1);
        expect(utils.addButtonsIfExists.args).to.eql([[node, runtime, variables]]);
        expect(runtime.trace.addTrace.callCount).to.eql(0);
        expect(runtime.storage.delete.args).to.eql([[StorageType.NO_MATCHES_COUNTER], [StorageType.NO_REPLIES_COUNTER]]);
      });
    });

    describe('action is not response', () => {
      describe('no handler found', () => {
        it('with elseId', () => {
          const utils = {
            commandHandler: { canHandle: sinon.stub().returns(false) },
            repeatHandler: { canHandle: sinon.stub().returns(false) },
            noReplyHandler: { canHandle: sinon.stub().returns(false) },
            noMatchHandler: { handle: sinon.stub().returns('else-id') },
          };

          const node = { id: 'node-id', interactions: [] };
          const runtime = {
            getAction: sinon.stub().returns(Action.REQUEST),
            getRequest: sinon.stub().returns({}),
            setAction: sinon.stub(),
            trace: { addTrace: sinon.stub() },
            storage: { delete: sinon.stub() },
          };
          const variables = { var1: 'val1' };
          const handler = InteractionHandler(utils as any);

          expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql('else-id');
          expect(runtime.getAction.callCount).to.eql(1);
          expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
          expect(utils.repeatHandler.canHandle.args).to.eql([[runtime]]);
          expect(utils.noMatchHandler.handle.args).to.eql([[node, runtime, variables]]);
        });

        describe('without elseId', () => {
          it('no interactions', () => {
            const utils = {
              commandHandler: { canHandle: sinon.stub().returns(false) },
              repeatHandler: { canHandle: sinon.stub().returns(false) },
              noReplyHandler: { canHandle: sinon.stub().returns(false) },
              noMatchHandler: { handle: sinon.stub().returns(null) },
            };

            const node = { id: 'node-id', interactions: [] };
            const runtime = {
              getAction: sinon.stub().returns(Action.REQUEST),
              getRequest: sinon.stub().returns({}),
              setAction: sinon.stub(),
              trace: { addTrace: sinon.stub() },
              storage: { delete: sinon.stub() },
            };
            const variables = { var1: 'val1' };
            const handler = InteractionHandler(utils as any);

            expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
            expect(runtime.getAction.callCount).to.eql(1);
            expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
            expect(utils.repeatHandler.canHandle.args).to.eql([[runtime]]);
            expect(utils.noMatchHandler.handle.args).to.eql([[node, runtime, variables]]);
          });

          it('no matcher', () => {
            const utils = {
              commandHandler: { canHandle: sinon.stub().returns(false) },
              repeatHandler: { canHandle: sinon.stub().returns(false) },
              noReplyHandler: { canHandle: sinon.stub().returns(false) },
              noMatchHandler: { handle: sinon.stub().returns(null) },
              findEventMatcher: sinon.stub().returns(null),
            };

            const node = { id: 'node-id', interactions: [{ event: { foo: 'bar' } }] };
            const runtime = {
              getAction: sinon.stub().returns(Action.REQUEST),
              setAction: sinon.stub(),
              getRequest: sinon.stub().returns({}),
              trace: { addTrace: sinon.stub() },
              storage: { delete: sinon.stub() },
            };
            const variables = { var1: 'val1' };
            const handler = InteractionHandler(utils as any);

            expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
            expect(runtime.getAction.callCount).to.eql(1);
            expect(utils.findEventMatcher.args).to.eql([[{ event: node.interactions[0].event, runtime, variables }]]);
            expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
            expect(utils.repeatHandler.canHandle.args).to.eql([[runtime]]);
            expect(utils.noMatchHandler.handle.args).to.eql([[node, runtime, variables]]);
          });
        });
      });

      describe('handler found', () => {
        it('command can handle', () => {
          const output = 'next-id';
          const utils = {
            commandHandler: { canHandle: sinon.stub().returns(true), handle: sinon.stub().returns(output) },
            noReplyHandler: { canHandle: sinon.stub().returns(false) },
          };

          const node = { id: 'node-id', interactions: [] };
          const runtime = {
            getAction: sinon.stub().returns(Action.REQUEST),
            setAction: sinon.stub(),
            getRequest: sinon.stub().returns({}),
            storage: { delete: sinon.stub() },
          };
          const variables = { var1: 'val1' };
          const handler = InteractionHandler(utils as any);

          expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(output);
          expect(runtime.getAction.callCount).to.eql(1);
          expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
          expect(utils.commandHandler.handle.args).to.eql([[runtime, variables]]);
        });

        it('repeat can handle', () => {
          const output = 'next-id';
          const utils = {
            commandHandler: { canHandle: sinon.stub().returns(false) },
            repeatHandler: { canHandle: sinon.stub().returns(true), handle: sinon.stub().returns(output) },
            noReplyHandler: { canHandle: sinon.stub().returns(false) },
          };

          const node = { id: 'node-id', interactions: [] };
          const runtime = {
            getAction: sinon.stub().returns(Action.REQUEST),
            setAction: sinon.stub(),
            getRequest: sinon.stub().returns({}),
            storage: { delete: sinon.stub() },
          };
          const variables = { var1: 'val1' };
          const handler = InteractionHandler(utils as any);

          expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(output);
          expect(runtime.getAction.callCount).to.eql(1);
          expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
          expect(utils.repeatHandler.canHandle.args).to.eql([[runtime]]);
          expect(utils.repeatHandler.handle.args).to.eql([[runtime]]);
        });

        it('noMatch can handle', () => {
          const output = 'next-id';
          const utils = {
            commandHandler: { canHandle: sinon.stub().returns(false) },
            repeatHandler: { canHandle: sinon.stub().returns(false) },
            noReplyHandler: { canHandle: sinon.stub().returns(false) },
            noMatchHandler: { handle: sinon.stub().returns(output) },
          };

          const node = { id: 'node-id', interactions: [] };
          const runtime = {
            getAction: sinon.stub().returns(Action.REQUEST),
            setAction: sinon.stub(),
            getRequest: sinon.stub().returns({}),
            storage: { delete: sinon.stub() },
          };
          const variables = { var1: 'val1' };
          const handler = InteractionHandler(utils as any);

          expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(output);
          expect(runtime.getAction.callCount).to.eql(1);
          expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
          expect(utils.repeatHandler.canHandle.args).to.eql([[runtime]]);
          expect(utils.noMatchHandler.handle.args).to.eql([[node, runtime, variables]]);
        });

        it('noReply can handle', () => {
          const output = 'next-id';
          const utils = {
            noReplyHandler: {
              canHandle: sinon.stub().returns(true),
              handle: sinon.stub().returns(output),
            },
          };
          const handler = InteractionHandler(utils as any);

          const node = { id: 'node-id' };
          const runtime = {
            getAction: sinon.stub().returns(Action.REQUEST),
            setAction: sinon.stub(),
            getRequest: sinon.stub().returns({}),
            storage: { delete: sinon.stub() },
          };
          const variables = { var1: 'val1' };
          expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(output);
          expect(utils.noReplyHandler.handle.args).to.eql([[node, runtime, variables]]);
        });

        describe('eventMatcher can handle', () => {
          it('with nextId', () => {
            const sideEffect = sinon.stub();
            const utils = {
              findEventMatcher: sinon.stub().returns({ sideEffect }),
              noReplyHandler: { canHandle: sinon.stub().returns(false) },
            };

            const node = { id: 'node-id', interactions: [{ event: { foo: 'bar' }, nextId: 'next-id' }] };
            const runtime = {
              getAction: sinon.stub().returns(Action.REQUEST),
              setAction: sinon.stub(),
              trace: { addTrace: sinon.stub() },
              getRequest: sinon.stub().returns({}),
              storage: { delete: sinon.stub() },
            };
            const variables = { var1: 'val1' };
            const handler = InteractionHandler(utils as any);

            expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.interactions[0].nextId);
            expect(runtime.getAction.callCount).to.eql(1);
            expect(utils.findEventMatcher.args).to.eql([[{ event: node.interactions[0].event, runtime, variables }]]);
            expect(sideEffect.callCount).to.eql(1);
            expect(runtime.trace.addTrace.args).to.eql([[{ type: 'path', payload: { path: 'choice:1' } }]]);
          });

          it('with goTo', () => {
            const sideEffect = sinon.stub();
            const utils = {
              findEventMatcher: sinon.stub().returns({ sideEffect }),
              noReplyHandler: { canHandle: sinon.stub().returns(false) },
            };

            const node = { id: 'node-id', interactions: [{ event: { foo: 'bar', goTo: { request: 'request' } } }] };
            const runtime = {
              getAction: sinon.stub().returns(Action.REQUEST),
              setAction: sinon.stub(),
              trace: { addTrace: sinon.stub() },
              getRequest: sinon.stub().returns({}),
              storage: { delete: sinon.stub() },
            };
            const variables = { var1: 'val1' };
            const handler = InteractionHandler(utils as any);

            expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.id);
            expect(runtime.getAction.callCount).to.eql(1);
            expect(utils.findEventMatcher.args).to.eql([[{ event: node.interactions[0].event, runtime, variables }]]);
            expect(sideEffect.callCount).to.eql(1);
            expect(runtime.trace.addTrace.args).to.eql([[{ type: 'goto', payload: { request: node.interactions[0].event.goTo.request } }]]);
          });

          it('iterate events', () => {
            const sideEffect = sinon.stub();
            const utils = {
              findEventMatcher: sinon
                .stub()
                .onCall(3)
                .returns({ sideEffect }),
              noReplyHandler: { canHandle: sinon.stub().returns(false) },
            };

            const node = {
              id: 'node-id',
              interactions: [
                { event: { foo: 'one' }, nextId: 'one' },
                { event: { foo: 'two' }, nextId: 'two' },
                { event: { foo: 'three' }, nextId: 'three' },
                { event: { foo: 'four' }, nextId: 'four' },
              ],
            };
            const runtime = {
              getAction: sinon.stub().returns(Action.REQUEST),
              setAction: sinon.stub(),
              trace: { addTrace: sinon.stub() },
              getRequest: sinon.stub().returns({}),
              storage: { delete: sinon.stub() },
            };
            const variables = { var1: 'val1' };
            const handler = InteractionHandler(utils as any);

            expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.interactions[3].nextId);
            expect(runtime.getAction.callCount).to.eql(1);
            expect(utils.findEventMatcher.args[3]).to.eql([{ event: node.interactions[3].event, runtime, variables }]);
            expect(sideEffect.callCount).to.eql(1);
            expect(runtime.trace.addTrace.args).to.eql([[{ type: 'path', payload: { path: 'choice:4' } }]]);
          });

          it('without nextId', () => {
            const sideEffect = sinon.stub();
            const utils = {
              findEventMatcher: sinon.stub().returns({ sideEffect }),
              noReplyHandler: { canHandle: sinon.stub().returns(false) },
            };

            const node = { id: 'node-id', interactions: [{ event: { foo: 'bar' } }] };
            const runtime = {
              getAction: sinon.stub().returns(Action.REQUEST),
              setAction: sinon.stub(),
              trace: { addTrace: sinon.stub() },
              getRequest: sinon.stub().returns({}),
              storage: { delete: sinon.stub() },
            };
            const variables = { var1: 'val1' };
            const handler = InteractionHandler(utils as any);

            expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
            expect(runtime.getAction.callCount).to.eql(1);
            expect(utils.findEventMatcher.args).to.eql([[{ event: node.interactions[0].event, runtime, variables }]]);
            expect(sideEffect.callCount).to.eql(1);
            expect(runtime.trace.addTrace.args).to.eql([[{ type: 'path', payload: { path: 'choice:1' } }]]);
          });
        });
      });
    });
  });
});
