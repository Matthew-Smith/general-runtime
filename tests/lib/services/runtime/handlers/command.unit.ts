/* eslint-disable max-nested-callbacks */
import { Node } from '@voiceflow/base-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { CommandHandler, getCommand as GetCommand } from '@/lib/services/runtime/handlers/command';
import { FrameType } from '@/lib/services/runtime/types';

const JumpPathTrace = { type: 'path', payload: { path: 'jump' } };
const PushPathTrace = { type: 'path', payload: { path: 'push' } };

describe('Command handler', () => {
  describe('getCommand', () => {
    it('returns null', () => {
      const runtime = { stack: [] };
      const extractFrame = sinon.stub().returns(undefined);
      expect(GetCommand(runtime as any, extractFrame)).to.eql(null);
      expect(extractFrame.callCount).to.eql(1);
      expect(extractFrame.args[0].length).to.eql(2);
      expect(extractFrame.args[0][0]).to.eql(runtime.stack);
      expect(typeof extractFrame.args[0][1]).to.eql('function');
    });

    it('returns frame', () => {
      const frame = {};
      const runtime = { stack: [] };
      const extractFrame = sinon.stub().returns(frame);
      expect(GetCommand(runtime as any, extractFrame)).to.eql(frame);
      expect(extractFrame.callCount).to.eql(1);
      expect(extractFrame.args[0].length).to.eql(2);
      expect(extractFrame.args[0][0]).to.eql(runtime.stack);
      expect(typeof extractFrame.args[0][1]).to.eql('function');
    });
  });

  describe('canHandle', () => {
    it('false', () => {
      const getCommand = sinon.stub().returns(null);
      const runtime = {};

      expect(CommandHandler({ getCommand } as any).canHandle(runtime as any)).to.eql(false);
      expect(getCommand.args).to.eql([[runtime]]);
    });

    it('true', () => {
      const getCommand = sinon.stub().returns({});
      const runtime = {};

      expect(CommandHandler({ getCommand } as any).canHandle(runtime as any)).to.eql(true);
      expect(getCommand.args).to.eql([[runtime]]);
    });
  });

  describe('handle', () => {
    describe('command type other', () => {
      it('with matcher', () => {
        const commandObj = { event: { foo: 'bar' } };
        const sideEffectStub = sinon.stub();
        const utils = {
          findEventMatcher: sinon.stub().returns({ sideEffect: sideEffectStub }),
          getCommand: sinon.stub().returns({ command: commandObj }),
        };
        const handler = CommandHandler(utils as any);

        const runtime = {};
        const variables = { var1: 'val1' };

        expect(handler.handle(runtime as any, variables as any)).to.eql(null);
        expect(utils.getCommand.args).to.eql([[runtime]]);
        expect(utils.findEventMatcher.args).to.eql([[{ event: commandObj.event, runtime, variables }]]);
        expect(sideEffectStub.callCount).to.eql(1);
      });

      it('no matcher', () => {
        const commandObj = { event: { foo: 'bar' } };
        const utils = {
          findEventMatcher: sinon.stub().returns(null),
          getCommand: sinon.stub().returns({ command: commandObj }),
        };
        const handler = CommandHandler(utils as any);

        const runtime = {};
        const variables = { var1: 'val1' };

        expect(handler.handle(runtime as any, variables as any)).to.eql(null);
        expect(utils.getCommand.args).to.eql([[runtime]]);
        expect(utils.findEventMatcher.args).to.eql([[{ event: commandObj.event, runtime, variables }]]);
      });
    });

    describe('command type jump', () => {
      it('no top of stack', () => {
        const commandObj = { event: { foo: 'bar' }, type: Node.Utils.CommandType.JUMP, nextID: 'next-id' };
        const index = 1;
        const sideEffectStub = sinon.stub();
        const utils = {
          findEventMatcher: sinon.stub().returns({ sideEffect: sideEffectStub }),
          getCommand: sinon.stub().returns({ command: commandObj, index }),
        };
        const handler = CommandHandler(utils as any);

        const setNodeID = sinon.stub();
        const runtime = {
          stack: { getSize: sinon.stub().returns(3), popTo: sinon.stub(), top: sinon.stub().returns({ setNodeID }) },
          trace: { debug: sinon.stub(), addTrace: sinon.stub() },
        };
        const variables = { var1: 'val1' };

        expect(handler.handle(runtime as any, variables as any)).to.eql(null);
        expect(utils.getCommand.args).to.eql([[runtime]]);
        expect(utils.findEventMatcher.args).to.eql([[{ event: commandObj.event, runtime, variables }]]);
        expect(sideEffectStub.callCount).to.eql(1);
        expect(runtime.stack.getSize.callCount).to.eql(0);
        expect(runtime.stack.popTo.args).to.eql([[index + 1]]);
        expect(setNodeID.args).to.eql([[commandObj.nextID]]);
        expect(runtime.trace.debug.args).to.eql([[`matched command **${commandObj.type}** - jumping to node`, Node.NodeType.COMMAND]]);
        expect(runtime.trace.addTrace.args).to.eql([[JumpPathTrace]]);
      });

      describe('top of stack', () => {
        it('with nextID', () => {
          const commandObj = { event: { foo: 'bar' }, type: Node.Utils.CommandType.JUMP, nextID: 'next-id' };
          const index = 2;
          const sideEffectStub = sinon.stub();
          const utils = {
            findEventMatcher: sinon.stub().returns({ sideEffect: sideEffectStub }),
            getCommand: sinon.stub().returns({ command: commandObj, index }),
          };
          const handler = CommandHandler(utils as any);

          const setNodeID = sinon.stub();
          const runtime = {
            stack: { popTo: sinon.stub(), top: sinon.stub().returns({ setNodeID }) },
            trace: { debug: sinon.stub(), addTrace: sinon.stub() },
          };
          const variables = { var1: 'val1' };

          expect(handler.handle(runtime as any, variables as any)).to.eql(null);
          expect(utils.getCommand.args).to.eql([[runtime]]);
          expect(utils.findEventMatcher.args).to.eql([[{ event: commandObj.event, runtime, variables }]]);
          expect(sideEffectStub.callCount).to.eql(1);
          expect(runtime.stack.popTo.args).to.eql([[index + 1]]);
          expect(setNodeID.args).to.eql([[commandObj.nextID]]);
          expect(runtime.trace.debug.args).to.eql([[`matched command **${commandObj.type}** - jumping to node`, Node.NodeType.COMMAND]]);
          expect(runtime.trace.addTrace.args).to.eql([[JumpPathTrace]]);
        });

        it('no nextID', () => {
          const commandObj = { event: { foo: 'bar' }, type: Node.Utils.CommandType.JUMP };
          const index = 2;
          const sideEffectStub = sinon.stub();
          const utils = {
            findEventMatcher: sinon.stub().returns({ sideEffect: sideEffectStub }),
            getCommand: sinon.stub().returns({ command: commandObj, index }),
          };
          const handler = CommandHandler(utils as any);

          const setNodeID = sinon.stub();
          const runtime = {
            stack: { popTo: sinon.stub(), top: sinon.stub().returns({ setNodeID }) },
            trace: { debug: sinon.stub(), addTrace: sinon.stub() },
          };
          const variables = { var1: 'val1' };

          expect(handler.handle(runtime as any, variables as any)).to.eql(null);
          expect(utils.getCommand.args).to.eql([[runtime]]);
          expect(utils.findEventMatcher.args).to.eql([[{ event: commandObj.event, runtime, variables }]]);
          expect(sideEffectStub.callCount).to.eql(1);
          expect(runtime.stack.popTo.args).to.eql([[index + 1]]);
          expect(setNodeID.args).to.eql([[null]]);
          expect(runtime.trace.debug.args).to.eql([[`matched command **${commandObj.type}** - jumping to node`, Node.NodeType.COMMAND]]);
          expect(runtime.trace.addTrace.args).to.eql([[JumpPathTrace]]);
        });
      });
    });

    describe('command type push', () => {
      it('no diagramID', () => {
        const commandObj = { event: { foo: 'bar' }, type: Node.Utils.CommandType.PUSH };
        const sideEffectStub = sinon.stub();
        const utils = {
          findEventMatcher: sinon.stub().returns({ sideEffect: sideEffectStub }),
          getCommand: sinon.stub().returns({ command: commandObj }),
        };
        const handler = CommandHandler(utils as any);

        const runtime = {};
        const variables = { var1: 'val1' };

        expect(handler.handle(runtime as any, variables as any)).to.eql(null);
        expect(utils.getCommand.args).to.eql([[runtime]]);
        expect(utils.findEventMatcher.args).to.eql([[{ event: commandObj.event, runtime, variables }]]);
        expect(sideEffectStub.callCount).to.eql(1);
      });

      it('with diagramID', () => {
        const commandObj = { event: { foo: 'bar' }, type: Node.Utils.CommandType.PUSH, diagramID: 'diagram-id' };
        const sideEffectStub = sinon.stub();
        const utils = {
          findEventMatcher: sinon.stub().returns({ sideEffect: sideEffectStub }),
          getCommand: sinon.stub().returns({ command: commandObj }),
          Frame: sinon.stub(),
        };
        const handler = CommandHandler(utils as any);

        const storageSetStub = sinon.stub();
        const runtime = {
          stack: { top: sinon.stub().returns({ storage: { set: storageSetStub } }), push: sinon.stub() },
          trace: { debug: sinon.stub(), addTrace: sinon.stub() },
        };
        const variables = { var1: 'val1' };

        expect(handler.handle(runtime as any, variables as any)).to.eql(null);
        expect(utils.getCommand.args).to.eql([[runtime]]);
        expect(utils.findEventMatcher.args).to.eql([[{ event: commandObj.event, runtime, variables }]]);
        expect(sideEffectStub.callCount).to.eql(1);
        expect(runtime.trace.debug.args).to.eql([[`matched command **${commandObj.type}** - adding command flow`, Node.NodeType.COMMAND]]);
        expect(storageSetStub.args).to.eql([[FrameType.CALLED_COMMAND, true]]);
        expect(utils.Frame.args).to.eql([[{ programID: commandObj.diagramID }]]);
        expect(runtime.stack.push.args).to.eql([[{}]]);
        expect(runtime.trace.addTrace.args).to.eql([[PushPathTrace]]);
      });
    });
  });
});
