import {splitPreamble} from './source-preamble.js';

const identifier = /^[A-Za-z_][A-Za-z0-9_]*$/;
const memberSyntax = /^[+\-#~]?(?:(?:[A-Za-z_][A-Za-z0-9_.]*\s+)?[A-Za-z_][A-Za-z0-9_]*)(?:\s*\([A-Za-z0-9_, .:]*\))?(?:\s*:\s*[A-Za-z_][A-Za-z0-9_.]*)?$/;
export const classRelationshipOperators = ['<|--', '--|>', '*--', '--*', 'o--', '--o', '-->', '<--', '--', '..>', '<..', '..|>', '<|..', '..'];
const operatorPattern = classRelationshipOperators.slice().sort((a, b) => b.length - a.length).map(operator => operator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
const relationshipPattern = new RegExp(`^([A-Za-z_][A-Za-z0-9_]*)(\\s+)(${operatorPattern})(\\s+)([A-Za-z_][A-Za-z0-9_]*)(?:\\s*:\\s*(.+))?$`);
function fail(message) { throw new Error(message); }

function validate(model) {
  if (!model.classes.length) fail('Keep at least one class in the diagram.');
  const ids = new Set();
  for (const item of model.classes) {
    if (!identifier.test(item.id)) fail('Use class names with letters, digits and underscores.');
    if (ids.has(item.id)) fail('Class names must be unique.');
    ids.add(item.id);
    for (const member of [...item.attributes, ...item.methods]) if (!memberSyntax.test(member.text)) fail('Use a supported one-line attribute or method signature.');
  }
  for (const relation of model.relationships) {
    if (!ids.has(relation.from) || !ids.has(relation.to)) fail('Relationships must connect classes declared in the diagram.');
    if (!classRelationshipOperators.includes(relation.operator)) fail('Use a supported Mermaid class relationship.');
    if (typeof relation.label !== 'string' || /[\r\n<>]/.test(relation.label)) fail('Relationship labels must be plain single-line text.');
  }
}

function parseRelationship(raw) {
  const leading = raw.match(/^\s*/)[0], trimmed = raw.trim(), match = trimmed.match(relationshipPattern);
  if (!match) return null;
  const label = match[6] ?? '';
  const labelDelimiter = match[6] === undefined ? '' : (trimmed.match(/\s*:\s*(?=.+$)/)?.[0] || ': ');
  return {kind: 'relationship', raw, leading, from: match[1], fromGap: match[2], operator: match[3], toGap: match[4], to: match[5], label, labelDelimiter};
}

function serializeRelationship(relation) {
  const original = relation.raw && parseRelationship(relation.raw);
  if (original && ['from','fromGap','operator','toGap','to','label'].every(field => original[field] === relation[field])) return relation.raw;
  return `${relation.leading}${relation.from}${relation.fromGap}${relation.operator}${relation.toGap}${relation.to}${relation.label ? (relation.labelDelimiter || ': ') + relation.label : ''}`;
}

function member(raw, text, isMethod) { return {raw, text, isMethod}; }

export function parseClassDiagram(source) {
  const model = {preamble: '', headerRaw: null, rows: [], classes: [], relationships: [], error: null};
  try {
    const split = splitPreamble(source); model.preamble = split.preamble;
    const lines = split.body.split(/\r?\n/);
    const header = lines.shift();
    if (!/^classDiagram\s*$/.test(header || '')) fail('Visual class editing requires a plain classDiagram header. Edit source directly.');
    model.headerRaw = header; model.rows.push({kind: 'header', raw: header});
    for (let i = 0; i < lines.length;) {
      const raw = lines[i], trimmed = raw.trim();
      if (!trimmed || trimmed.startsWith('%%')) { model.rows.push({kind: 'raw', raw}); i++; continue; }
      const declaration = raw.match(/^(\s*)class\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*(\{))?\s*$/);
      if (declaration) {
        const item = {id: declaration[2], indent: declaration[1], block: Boolean(declaration[3]), attributes: [], methods: [], headerRaw: raw, closeRaw: null};
        const row = {kind: 'class', item}; model.rows.push(row); model.classes.push(item); i++;
        if (item.block) {
          let methodStarted = false, closed = false;
          for (; i < lines.length; i++) {
            const memberRaw = lines[i], memberText = memberRaw.trim();
            if (/^\s*\}\s*$/.test(memberRaw)) { item.closeRaw = memberRaw; closed = true; i++; break; }
            if (!memberText || memberText.startsWith('%%')) fail(`Line ${i + 2} uses comments or blank rows inside a class body. Edit source directly.`);
            if (/\t/.test(memberRaw) || memberRaw.match(/^ */)[0].length < declaration[1].length + 4) fail(`Line ${i + 2} must indent class members beneath their declaration.`);
            if (!memberSyntax.test(memberText)) fail(`Line ${i + 2} uses an unsupported class member signature. Edit source directly.`);
            const isMethod = memberText.includes('(');
            if (!isMethod && methodStarted) fail(`Line ${i + 2} places an attribute after a method. Edit source directly.`);
            if (isMethod) methodStarted = true;
            (isMethod ? item.methods : item.attributes).push(member(memberRaw, memberText, isMethod));
          }
          if (!closed) fail(`Class ${item.id} is missing its closing brace.`);
        }
        continue;
      }
      if (trimmed.startsWith('class ') || /^(?:direction|namespace|style|classDef|click|note|accTitle|accDescr)\b/i.test(trimmed)) fail(`Line ${i + 2} uses class syntax outside the visual editor subset. Edit source directly.`);
      const relationship = parseRelationship(raw);
      if (relationship) {
        model.rows.push(relationship); model.relationships.push(relationship);
        i++; continue;
      }
      if (/^[A-Za-z_][A-Za-z0-9_]*\s+[.o*|<>-]/.test(trimmed)) fail(`Line ${i + 2} uses an unsupported class relationship. Edit source directly.`);
      fail(`Line ${i + 2} uses unsupported class syntax. Edit source directly.`);
    }
    validate(model);
  } catch (error) { model.error = error.message; }
  return model;
}

function serializeClass(item) {
  const unchangedName = item.headerRaw?.match(/^\s*class\s+([A-Za-z_][A-Za-z0-9_]*)/i)?.[1] === item.id;
  if (!item.block && !item.attributes.length && !item.methods.length) return unchangedName ? item.headerRaw : item.indent + 'class ' + item.id;
  const opening = unchangedName && item.block ? item.headerRaw : item.indent + `class ${item.id} {`;
  const members = [...item.attributes, ...item.methods].map(entry => entry.raw && entry.raw.trim() === entry.text ? entry.raw : item.indent + '    ' + entry.text);
  const close = item.closeRaw ?? item.indent + '}';
  return [opening, ...members, close].join('\n');
}

export function serializeClassDiagram(model) {
  validate(model);
  return model.preamble + model.rows.map(row => row.kind === 'class' ? serializeClass(row.item) : row.kind === 'relationship' ? serializeRelationship(row) : row.raw ?? '').join('\n').replace(/\n*$/, '\n');
}

export function addClass(model) {
  let i = 1;
  while (model.classes.some(item => item.id === `Class${i}`)) i++;
  const item = {id: `Class${i}`, indent: '    ', block: false, attributes: [], methods: [], headerRaw: undefined, closeRaw: null};
  const row = {kind: 'class', item};
  const relationship = model.rows.findIndex(line => line.kind === 'relationship');
  model.rows.splice(relationship < 0 ? model.rows.length : relationship, 0, row);
  model.classes.push(item);
  return item.id;
}

export function updateClass(model, id, patch) {
  const item = model.classes.find(candidate => candidate.id === id);
  if (!item) fail('This class no longer exists.');
  if (patch.id !== undefined) {
    if (!identifier.test(patch.id) || model.classes.some(candidate => candidate.id === patch.id && candidate !== item)) fail('Use a unique class name with letters, digits and underscores.');
    const previous = item.id;
    item.id = patch.id;
    for (const row of model.relationships) {
      if (row.from === previous) row.from = patch.id;
      if (row.to === previous) row.to = patch.id;
    }
  }
  for (const [field, value] of [['attributes', patch.attributes], ['methods', patch.methods]]) {
    if (value === undefined) continue;
    if (!Array.isArray(value) || value.some(text => typeof text !== 'string' || !memberSyntax.test(text.trim()) || text.includes('\n') || text.includes('\r'))) fail('Use supported one-line attribute or method signatures.');
    const list = field === 'attributes' ? item.attributes : item.methods;
    const method = field === 'methods';
    const next = value.map((text, index) => {
      const normalized = text.trim();
      if (normalized.includes('(') !== method) fail(method ? 'Methods must include parentheses.' : 'Attributes cannot include method parentheses.');
      return list[index]?.text === normalized ? list[index] : member(undefined, normalized, method);
    });
    item[field] = next;
  }
  validate(model);
}

export function removeClass(model, id) {
  const item = model.classes.find(candidate => candidate.id === id);
  if (!item) fail('This class no longer exists.');
  if (model.classes.length <= 1) fail('Keep at least one class in the diagram.');
  model.rows = model.rows.filter(row => row.kind !== 'relationship' || row.from !== id && row.to !== id);
  model.relationships = model.rows.filter(row => row.kind === 'relationship');
  model.rows.splice(model.rows.findIndex(row => row.kind === 'class' && row.item === item), 1);
  model.classes.splice(model.classes.indexOf(item), 1);
}

export function classMembers(item) {
  return {attributes: item.attributes.map(entry => entry.text), methods: item.methods.map(entry => entry.text)};
}

export function addClassRelationship(model, {from, to, operator = '-->', label = ''}) {
  const relation = {kind: 'relationship', raw: undefined, leading: '    ', from, fromGap: ' ', operator, toGap: ' ', to, label, labelDelimiter: label ? ': ' : ''};
  if (!model.classes.some(item => item.id === from) || !model.classes.some(item => item.id === to)) fail('Choose existing classes for both relationship endpoints.');
  if (!classRelationshipOperators.includes(operator)) fail('Choose a supported relationship type.');
  if (typeof label !== 'string' || /[\r\n<>]/.test(label)) fail('Relationship labels must be plain single-line text.');
  const row = model.rows.findLastIndex(item => item.raw !== '');
  model.rows.splice(row + 1, 0, relation);
  model.relationships.push(relation);
  validate(model);
  return model.relationships.length - 1;
}

export function updateClassRelationship(model, index, patch) {
  const relation = model.relationships[index];
  if (!relation) fail('This relationship no longer exists.');
  const next = {...relation, ...patch};
  if (!model.classes.some(item => item.id === next.from) || !model.classes.some(item => item.id === next.to)) fail('Choose existing classes for both relationship endpoints.');
  if (!classRelationshipOperators.includes(next.operator)) fail('Choose a supported relationship type.');
  if (typeof next.label !== 'string' || /[\r\n<>]/.test(next.label)) fail('Relationship labels must be plain single-line text.');
  if (next.label && !relation.label) next.labelDelimiter = ': ';
  Object.assign(relation, next);
  validate(model);
}

export function removeClassRelationship(model, index) {
  const relation = model.relationships[index];
  if (!relation) fail('This relationship no longer exists.');
  model.rows.splice(model.rows.indexOf(relation), 1);
  model.relationships.splice(index, 1);
}

export function moveClassRelationship(model, index, delta) {
  const target = index + delta;
  if (!model.relationships[index] || !model.relationships[target]) return index;
  const rowA = model.rows.indexOf(model.relationships[index]), rowB = model.rows.indexOf(model.relationships[target]);
  [model.rows[rowA], model.rows[rowB]] = [model.rows[rowB], model.rows[rowA]];
  [model.relationships[index], model.relationships[target]] = [model.relationships[target], model.relationships[index]];
  return target;
}
