import assert from 'node:assert/strict';
import {addClass, addClassRelationship, classMembers, classRelationshipOperators, moveClassRelationship, parseClassDiagram, removeClass, removeClassRelationship, serializeClassDiagram, updateClass, updateClassRelationship} from '../src/class-model.js';
import {diagramTemplates, diagramType} from '../src/diagram-types.js';

const base = diagramTemplates.find(template => template.id === 'class').source;
function test(name, fn) { fn(); console.log('PASS', name); }

test('class template is visual and source roundtrips unchanged', () => {
  const model = parseClassDiagram(base);
  assert.equal(model.error, null);
  assert.equal(serializeClassDiagram(model), base);
  assert.equal(diagramType(base), 'class');
  assert.equal(diagramTemplates.find(template => template.id === 'class').visual, true);
});

test('preamble, comments, formatting, and raw relationship rows are preserved', () => {
  const source = '%% retained\nclassDiagram\n    class User {\n        +String name\n    }\n    class Account\n    class Other\n    class External\n    %% relationship below\n    User --> Account: owns\n    Other ..> External: keep\n';
  const model = parseClassDiagram(source);
  updateClass(model, 'User', {id: 'Customer'});
  const output = serializeClassDiagram(model);
  assert(output.startsWith('%% retained\nclassDiagram\n'));
  assert(output.includes('    %% relationship below\n    Customer --> Account: owns\n'));
  assert(output.includes('    Other ..> External: keep\n'));
  assert(output.includes('class Customer {\n        +String name\n    }'));
});

test('classes and supported attributes/methods can be created, edited and removed', () => {
  const model = parseClassDiagram(base + '    class External\n    External --> User: unrelated\n');
  updateClass(model, 'User', {attributes: ['+String displayName', '-age: Int'], methods: ['+signIn(token: String)', '#reset()']});
  assert.deepEqual(classMembers(model.classes[0]), {attributes: ['+String displayName', '-age: Int'], methods: ['+signIn(token: String)', '#reset()']});
  const id = addClass(model);
  assert.equal(id, 'Class1');
  updateClass(model, id, {id: 'Session', attributes: ['+String token'], methods: ['+close()']});
  removeClass(model, 'Account');
  const output = serializeClassDiagram(model);
  assert(output.includes('class Session {\n        +String token\n        +close()\n    }'));
  assert(!output.includes('Customer --> Account: owns'));
  assert(output.includes('External --> User: unrelated'));
  assert(!output.includes('class Account'));
  assert.equal(parseClassDiagram(output).error, null);
});

test('invalid signatures, duplicate names, and deleting the final class are rejected', () => {
  const model = parseClassDiagram(base);
  assert.throws(() => updateClass(model, 'User', {id: 'Account'}), /unique class name/);
  assert.throws(() => updateClass(model, 'User', {attributes: ['name { invalid }']}), /supported one-line/);
  assert.throws(() => removeClass(parseClassDiagram('classDiagram\nclass Only\n'), 'Only'), /at least one class/);
});

test('all eight Mermaid relationship types and their reverse forms parse as supported', () => {
  const source = 'classDiagram\nclass A\nclass B\n' + classRelationshipOperators.map((operator, index) => `    A ${operator} B: label ${index + 1}\n`).join('');
  const model = parseClassDiagram(source);
  assert.equal(model.error, null);
  assert.equal(model.relationships.length, 14);
  assert.equal(serializeClassDiagram(model), source);
  assert.deepEqual(model.relationships.map(relation => relation.operator), classRelationshipOperators);
});

test('relationships can be added, edited, reversed, reordered, and deleted with safe endpoints', () => {
  const model = parseClassDiagram('classDiagram\nclass A\nclass B\nA --> B: initial\n');
  updateClassRelationship(model, 0, {from: 'B', to: 'A', operator: '<|--', label: 'inherits'});
  assert(serializeClassDiagram(model).includes('B <|-- A: inherits'));
  const added = addClassRelationship(model, {from: 'A', to: 'B', operator: '*--', label: 'contains'});
  assert.equal(added, 1);
  assert.equal(moveClassRelationship(model, 1, -1), 0);
  assert.equal(model.relationships[0].operator, '*--');
  removeClassRelationship(model, 0);
  assert.equal(model.relationships.length, 1);
  assert.equal(parseClassDiagram(serializeClassDiagram(model)).error, null);
  assert.throws(() => addClassRelationship(model, {from: 'Missing', to: 'A'}), /existing classes/);
  assert.throws(() => updateClassRelationship(model, 0, {to: 'Missing'}), /existing classes/);
});

test('unsupported class syntax falls back safely', () => {
  for (const source of [
    'classDiagram\ndirection LR\nclass User\n',
    'classDiagram\nclass User {\n        +List<String> values\n    }\n',
    'classDiagram\nclass User {\n        +String name\n        %% annotation\n    }\n',
    'classDiagram\nnamespace Domain {\nclass User\n}\n',
    'classDiagram\nclass A\nclass B\nA "1" --> "*" B: many\n',
    'classDiagram\nclass A\nclass B\nA <|--|> B\n',
    'classDiagram\nclass A\nfoo ()-- A\n',
  ]) assert(parseClassDiagram(source).error, source);
});
