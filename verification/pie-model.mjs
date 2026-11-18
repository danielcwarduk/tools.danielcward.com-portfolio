import assert from 'node:assert/strict';
import {addPieSlice, movePieSlice, parsePie, removePieSlice, serializePie, updatePieSlice} from '../src/pie-model.js';
import {diagramTemplates, diagramType} from '../src/diagram-types.js';

const base = diagramTemplates.find(template => template.id === 'pie').source;
function test(name, fn) { fn(); console.log('PASS', name); }

test('pie template is detected as a visual diagram and roundtrips unchanged', () => {
  const model = parsePie(base);
  assert.equal(model.error, null);
  assert.equal(serializePie(model), base);
  assert.equal(diagramType(base), 'pie');
  assert.equal(diagramTemplates.find(template => template.id === 'pie').visual, true);
});

test('comments, title, showData and whitespace survive slice edits', () => {
  const source = '%% retained comment\npie showData\ntitle Budget\n    "Research" : 2.5\n    %% slice note\n    "Delivery" : 7\n';
  const model = parsePie(source);
  assert.equal(model.error, null);
  updatePieSlice(model, 0, {label: 'Discovery', value: '3.25'});
  const output = serializePie(model);
  assert(output.startsWith('%% retained comment\npie showData\ntitle Budget\n'));
  assert(output.includes('"Discovery" : 3.25'));
  assert(output.includes('    %% slice note\n'));
  assert.equal(parsePie(output).error, null);
});

test('slices can be added, reordered, edited and removed', () => {
  const model = parsePie(base);
  const added = addPieSlice(model);
  assert.equal(model.slices[added].label, 'Slice 1');
  assert.equal(movePieSlice(model, added, -1), added - 1);
  updatePieSlice(model, added - 1, {label: 'Other', value: 12});
  removePieSlice(model, added - 1);
  const output = serializePie(model);
  assert(!output.includes('Other'));
  assert.equal(parsePie(output).error, null);
});

test('invalid values and deleting the final slice are rejected', () => {
  const model = parsePie(base);
  assert.throws(() => updatePieSlice(model, 0, {value: -1}), /zero or greater/);
  const single = parsePie('pie\n"Only" : 1\n');
  assert.throws(() => removePieSlice(single, 0), /at least one slice/);
});

test('unsupported or malformed syntax stays source-only', () => {
  for (const source of [
    'pie\n"A" : 1\n"B" : nope\n',
    'pie\n"A" : 1\nshowData\n',
    'pie title Bad\n"A" : -1\n',
    'pie\n"Same" : 1\n"Same" : 2\n',
    'pie\n',
  ]) assert(parsePie(source).error);
});

test('quoted labels with escaped quotes and slashes roundtrip after edits', () => {
  const model = parsePie('pie\n"A" : 1\n"B" : 2\n');
  updatePieSlice(model, 0, {label: 'A "quote" \\ path'});
  const reparsed = parsePie(serializePie(model));
  assert.equal(reparsed.error, null);
  assert.equal(reparsed.slices[0].label, 'A "quote" \\ path');
});
