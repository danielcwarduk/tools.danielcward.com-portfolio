import assert from 'node:assert/strict';
import {addMindmapNode, mindmapNodes, parseMindmap, removeMindmapNode, serializeMindmap, updateMindmapNode} from '../src/mindmap-model.js';
import {diagramTemplates, diagramType} from '../src/diagram-types.js';

const base = diagramTemplates.find(template => template.id === 'mindmap').source;
function test(name, fn) { fn(); console.log('PASS', name); }
function id(model, label) { return mindmapNodes(model).find(node => node.label === label)?.key; }

test('mind map template parses and roundtrips without changes', () => {
  const model = parseMindmap(base);
  assert.equal(model.error, null);
  assert.equal(serializeMindmap(model), base);
  assert.equal(diagramType(base), 'mindmap');
  assert.equal(diagramTemplates.find(template => template.id === 'mindmap').visual, true);
});

test('preamble, raw rows, labels, and hierarchy survive edits', () => {
  const source = '%% retained\n---\ntheme: neutral\n---\nmindmap\n    root((Project))\n        Ideas\n            Research\n        Delivery\n';
  const model = parseMindmap(source);
  assert.equal(model.error, null);
  updateMindmapNode(model, id(model, 'Research'), {label: 'Field research'});
  const output = serializeMindmap(model);
  assert(output.startsWith('%% retained\n---\ntheme: neutral\n---\nmindmap\n'));
  assert(output.includes('            Field research\n'));
  assert.equal(parseMindmap(output).error, null);
});

test('branches can be added, reparented, renamed, and removed with descendants', () => {
  const model = parseMindmap(base);
  updateMindmapNode(model, id(model, 'Research'), {label: 'Research notes', parent: id(model, 'Ideas')});
  assert(model.root.children[0].children.some(child => child.label === 'Research notes'));
  assert.equal(model.root.children[1].children.some(child => child.label === 'Research notes'), false);
  const newKey = addMindmapNode(model, id(model, 'Ideas'));
  updateMindmapNode(model, newKey, {label: 'Notes'});
  updateMindmapNode(model, id(model, 'Research notes'), {parent: id(model, 'Delivery')});
  const output = serializeMindmap(model);
  assert.match(output, /Delivery\n            Build\n            Review\n            Research notes\n/);
  const notes = id(model, 'Notes');
  addMindmapNode(model, notes);
  removeMindmapNode(model, notes);
  assert(!serializeMindmap(model).includes('Branch 1'));
  assert.equal(parseMindmap(serializeMindmap(model)).error, null);
});

test('root cannot be moved or deleted and cycles are rejected', () => {
  const model = parseMindmap(base), root = model.root.key, ideas = id(model, 'Ideas'), research = id(model, 'Research');
  assert.throws(() => removeMindmapNode(model, root), /root cannot be deleted/);
  assert.throws(() => updateMindmapNode(model, root, {parent: ideas}), /root cannot be reparented/);
  assert.throws(() => updateMindmapNode(model, ideas, {parent: research}), /itself or one of its descendants/);
});

test('unsupported shapes, directives, and malformed indentation fall back safely', () => {
  for (const source of [
    'mindmap\n    root[Project]\n        Ideas\n',
    'mindmap\n    root((Project))\n        Ideas[branch]\n',
    'mindmap\n    root((Project))\n        Ideas\n        %% directive\n',
    'mindmap\n    root((Project))\n            Skipped level\n',
    'mindmap\n    root((Project))\n        accTitle: Project\n',
  ]) assert(parseMindmap(source).error, source);
  const model = parseMindmap(base);
  assert.throws(() => updateMindmapNode(model, id(model, 'Ideas'), {label: 'Ideas[shape]'}), /plain text/);
});
