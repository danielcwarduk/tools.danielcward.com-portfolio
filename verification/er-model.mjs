import assert from 'node:assert/strict';
import {addErEntity, addErField, addErRelationship, erCardinalityLeft, erCardinalityRight, erRelationshipStyles, moveErField, moveErRelationship, parseErDiagram, removeErEntity, removeErField, removeErRelationship, reverseErRelationship, serializeErDiagram, updateErEntity, updateErRelationship} from '../src/er-model.js';
import {diagramTemplates, diagramType} from '../src/diagram-types.js';

const base = diagramTemplates.find(template => template.id === 'er').source;
function test(name, fn) { fn(); console.log('PASS', name); }
function entity(model, id) { return model.entities.find(item => item.id === id); }

test('ER template parses and roundtrips with visual flag enabled', () => {
  const model = parseErDiagram(base);
  assert.equal(model.error, null);
  assert.equal(serializeErDiagram(model), base);
  assert.equal(diagramType(base), 'er');
  assert.equal(diagramTemplates.find(template => template.id === 'er').visual, true);
});

test('field types, names, and PK/FK/UK markers edit safely', () => {
  const model = parseErDiagram(base);
  updateErEntity(model, 'CUSTOMER', {fields:[{type:'string',name:'displayName',key:''},{type:'int',name:'id',key:'PK'},{type:'string',name:'ref',key:'UK'}]});
  const output = serializeErDiagram(model);
  assert(output.includes('string displayName\n        int id PK\n        string ref UK'));
  assert.equal(parseErDiagram(output).error, null);
});

test('entities can be created, renamed, and removed while raw relationship rows stay scoped', () => {
  const source = base + '    PRODUCT {\n        string sku PK\n    }\n    PRODUCT ||--o{ CUSTOMER : supplies\n';
  const model = parseErDiagram(source);
  updateErEntity(model, 'CUSTOMER', {id:'CLIENT'});
  assert(serializeErDiagram(model).includes('CLIENT ||--o{ ORDER : places'));
  assert(serializeErDiagram(model).includes('PRODUCT ||--o{ CLIENT : supplies'));
  assert.equal(addErEntity(model), 'Entity1');
  removeErEntity(model, 'ORDER');
  const output = serializeErDiagram(model);
  assert(!output.includes('CLIENT ||--o{ ORDER : places'));
  assert(output.includes('PRODUCT ||--o{ CLIENT : supplies'));
  assert.equal(parseErDiagram(output).error, null);
});

test('fields can be added, moved, and deleted', () => {
  const model = parseErDiagram(base);
  const index = addErField(model, 'ORDER');
  assert.equal(index, 2);
  updateErEntity(model, 'ORDER', {fields:[...entity(model, 'ORDER').fields.map(({type,name,key})=>({type,name,key})), {type:'string',name:'status',key:'UK'}]});
  assert.equal(moveErField(model, 'ORDER', 2, -1), 1);
  removeErField(model, 'ORDER', 1);
  const output = serializeErDiagram(model);
  assert(output.includes('string status UK'));
  assert.equal(parseErDiagram(output).error, null);
});

test('all endpoint marker combinations and both relationship styles roundtrip', () => {
  for (const left of erCardinalityLeft) for (const style of erRelationshipStyles) for (const right of erCardinalityRight) {
    const source = `erDiagram\n  A ${left}${style}${right} B : label\n  A\n  B\n`;
    const model = parseErDiagram(source);
    assert.equal(model.error, null, `${left}${style}${right}`);
    assert.equal(serializeErDiagram(model), source);
  }
});

test('relationships add, edit, reverse, reorder, and delete safely', () => {
  const model = parseErDiagram(base);
  const index = addErRelationship(model, {from:'ORDER',to:'CUSTOMER',leftCardinality:'}|',style:'..',rightCardinality:'|{',label:'contains'});
  updateErRelationship(model, index, {from:'CUSTOMER',to:'ORDER',leftCardinality:'|o',style:'--',rightCardinality:'o|',label:'owns'});
  reverseErRelationship(model, index);
  assert.equal(moveErRelationship(model, index, -1), 0);
  const output = serializeErDiagram(model);
  assert(output.includes('ORDER |o--o| CUSTOMER : owns'));
  removeErRelationship(model, 0);
  assert.equal(model.relationships.length, 1);
  assert.equal(parseErDiagram(serializeErDiagram(model)).error, null);
});

test('unsafe syntax and invalid edits fall back or are rejected', () => {
  for (const source of [
    'erDiagram\np[Person] {\n  string name\n}\n',
    'erDiagram\n%% comment\nENTITY\n',
    'erDiagram\ndirection LR\nENTITY\n',
    'erDiagram\nstyle ENTITY fill:#fff\nENTITY\n',
    'erDiagram\nENTITY {\n    string? optional\n}\n',
    'erDiagram\nENTITY {\n    string name PK, FK\n}\n',
    'erDiagram\nENTITY {\n    string name "comment"\n}\n',
    'erDiagram\nA ||---o{ B : invalid\nA\nB\n',
    'erDiagram\nA ||--x{ B : invalid\nA\nB\n',
  ]) assert(parseErDiagram(source).error, source);
  const model = parseErDiagram(base);
  assert.throws(() => updateErEntity(model, 'CUSTOMER', {fields:[{type:'string[]',name:'items',key:''}]}), /supported field/);
  assert.throws(() => removeErEntity(parseErDiagram('erDiagram\nONLY\n'), 'ONLY'), /at least one entity/);
});
