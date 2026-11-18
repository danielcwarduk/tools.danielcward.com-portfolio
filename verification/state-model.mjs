import assert from 'node:assert/strict';
import {addState, addStateTransition, moveStateTransition, parseStateDiagram, removeState, removeStateTransition, serializeStateDiagram, updateState, updateStateTransition} from '../src/state-model.js';
import {diagramTemplates, diagramType} from '../src/diagram-types.js';

const base = diagramTemplates.find(template => template.id === 'state').source;
function test(name, fn) { fn(); console.log('PASS', name); }

test('state template is visual and roundtrips unchanged', () => {
  const model = parseStateDiagram(base);
  assert.equal(model.error, null);
  assert.equal(serializeStateDiagram(model), base);
  assert.equal(diagramType(base), 'state');
  assert.equal(diagramTemplates.find(template => template.id === 'state').visual, true);
});

test('comments, blank lines, and untouched rows survive edits', () => {
  const input = '%% retained\nstateDiagram-v2\n    state Ready\n\n    Ready --> Working: Begin\n    # keep me\n';
  const model = parseStateDiagram(input);
  updateState(model, 'Ready', 'Idle');
  assert.equal(serializeStateDiagram(model), '%% retained\nstateDiagram-v2\n    state Idle\n\n    Idle --> Working: Begin\n    # keep me\n');
});

test('states and transitions can be added, edited, reordered and deleted', () => {
  const model = parseStateDiagram(base);
  const state = addState(model);
  updateState(model, state, 'Paused');
  const added = addStateTransition(model, {from: 'Paused', to: 'Working', label: 'Resume'});
  updateStateTransition(model, added, {label: 'Continue'});
  assert.equal(moveStateTransition(model, added, -1), added - 1);
  removeStateTransition(model, added - 1);
  removeState(model, 'Paused');
  assert.equal(parseStateDiagram(serializeStateDiagram(model)).error, null);
  assert(!serializeStateDiagram(model).includes('Paused'));
});

test('start and end transitions can be edited', () => {
  const model = parseStateDiagram(base);
  updateStateTransition(model, 0, {label: 'Initialize'});
  assert.equal(model.transitions[0].from, '[*]');
  assert(model.transitions.some(edge => edge.to === '[*]'));
});

test('advanced or unsafe syntax falls back to source editing', () => {
  for (const input of [
    'stateDiagram\n    A --> B\n',
    'stateDiagram-v2\n    state Parent {\n    A --> B\n',
    'stateDiagram-v2\n    direction LR\n    A --> B\n',
  ]) assert(parseStateDiagram(input).error, input);
  assert.throws(() => updateState(parseStateDiagram(base), 'Ready', 'not valid'), /state ID/);
  assert.throws(() => addStateTransition(parseStateDiagram(base), {from: '[*]', to: '[*]'}), /connect/);
});
