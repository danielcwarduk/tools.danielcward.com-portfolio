const entityId = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const fieldType = /^[A-Za-z][A-Za-z0-9_-]*$/;
const fieldName = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const relationPattern = /^([A-Za-z_][A-Za-z0-9_-]*)(\s+)(\|o|\|\||\}o|\}\|)(--|\.\.)(o\||\|\||o\{|\|\{)(\s+)([A-Za-z_][A-Za-z0-9_-]*)(?:\s*:\s*(.*))?$/;
export const erCardinalityLeft = ['|o', '||', '}o', '}|'];
export const erCardinalityRight = ['o|', '||', 'o{', '|{'];
export const erRelationshipStyles = ['--', '..'];
function fail(message) { throw new Error(message); }

function validate(model) {
  if (!model.entities.length) fail('Keep at least one entity in the ER diagram.');
  const ids = new Set();
  for (const entity of model.entities) {
    if (!entityId.test(entity.id)) fail('Use entity IDs with letters, digits, underscores, and hyphens.');
    if (ids.has(entity.id)) fail('Entity IDs must be unique.');
    ids.add(entity.id);
    const names = new Set();
    for (const field of entity.fields) {
      if (!fieldType.test(field.type) || !fieldName.test(field.name) || !['', 'PK', 'FK', 'UK'].includes(field.key)) fail('Use a supported field type, name, and optional PK/FK/UK marker.');
      if (names.has(field.name)) fail('Field names must be unique within an entity.');
      names.add(field.name);
    }
  }
  for (const relation of model.relationships) {
    if (!ids.has(relation.from) || !ids.has(relation.to)) fail('Relationship rows must refer to declared entities.');
    if (!erCardinalityLeft.includes(relation.leftCardinality) || !erRelationshipStyles.includes(relation.style) || !erCardinalityRight.includes(relation.rightCardinality)) fail('Use supported Mermaid cardinality markers and relationship style.');
    if (typeof relation.label !== 'string' || /[\r\n{}\[\]"'`]/.test(relation.label)) fail('Use a plain single-line relationship label.');
  }
}

function parseRelation(raw) {
  const leading = raw.match(/^\s*/)[0], match = raw.trim().match(relationPattern);
  if (!match) return null;
  const labelDelimiter = match[8] === undefined ? '' : (raw.trim().match(/\s*:\s*/) || [])[0];
  return {kind: 'relationship', raw, leading, from: match[1], fromGap: match[2], leftCardinality: match[3], style: match[4], rightCardinality: match[5], notation: match[3] + match[4] + match[5], toGap: match[6], to: match[7], tail: match[8] === undefined ? '' : labelDelimiter + match[8], label: match[8] ?? '', labelDelimiter};
}

function serializeRelation(relation) {
  if (relation.raw) {
    const current = parseRelation(relation.raw);
    if (current && ['from','fromGap','notation','toGap','to','tail','label','labelDelimiter'].every(field => current[field] === relation[field])) return relation.raw;
  }
  const notation = relation.leftCardinality + relation.style + relation.rightCardinality;
  return `${relation.leading}${relation.from}${relation.fromGap}${notation}${relation.toGap}${relation.to}${relation.label ? (relation.labelDelimiter || ' : ') + relation.label : ''}`;
}

function serializeEntity(entity) {
  if (!entity.block || !entity.fields.length) return entity.headerRaw && entity.headerRaw.trim() === entity.id ? entity.headerRaw : entity.indent + entity.id;
  const header = entity.headerRaw && entity.headerRaw.trim() === entity.id + ' {' ? entity.headerRaw : entity.indent + entity.id + ' {';
  const fields = entity.fields.map(field => {
    const text = `${field.type} ${field.name}${field.key ? ' ' + field.key : ''}`;
    return field.raw && field.raw.trim() === text ? field.raw : entity.indent + '    ' + text;
  });
  return [header, ...fields, entity.closeRaw ?? entity.indent + '}'].join('\n');
}

export function parseErDiagram(source) {
  const model = {headerRaw: null, rows: [], entities: [], relationships: [], error: null};
  try {
    if (/^(?:%%|---|\uFEFF)/.test(source)) fail('ER visual editing does not support preambles, comments, or directives. Edit source directly.');
    const lines = source.split(/\r?\n/);
    const header = lines.shift();
    if (!/^erDiagram\s*$/.test(header || '')) fail('Visual ER editing requires a plain erDiagram header. Edit source directly.');
    model.headerRaw = header; model.rows.push({kind:'header', raw:header});
    for (let i = 0; i < lines.length;) {
      const raw = lines[i], text = raw.trim();
      if (!text) { model.rows.push({kind:'raw', raw}); i++; continue; }
      if (/^(?:%%|(?:accTitle|accDescr|direction|style|classDef|class|subgraph)\b)/i.test(text)) fail(`Line ${i + 2} uses an unsupported ER directive or alias. Edit source directly.`);
      const relation = parseRelation(raw);
      if (relation) { model.rows.push(relation); model.relationships.push(relation); i++; continue; }
      const declaration = raw.match(/^(\s*)([A-Za-z_][A-Za-z0-9_-]*)(\s*(\{))?\s*$/);
      if (!declaration) fail(`Line ${i + 2} uses unsupported ER syntax. Edit source directly.`);
      const entity = {id: declaration[2], indent: declaration[1], block: Boolean(declaration[3]), fields: [], headerRaw: raw, closeRaw: null};
      model.rows.push({kind:'entity', entity}); model.entities.push(entity); i++;
      if (entity.block) {
        let closed = false;
        for (; i < lines.length; i++) {
          const fieldRaw = lines[i], fieldText = fieldRaw.trim();
          if (/^\s*\}\s*$/.test(fieldRaw)) { entity.closeRaw = fieldRaw; closed = true; i++; break; }
          if (!fieldText) fail(`Line ${i + 2} contains a blank row inside an entity. Edit source directly.`);
          if (/\t/.test(fieldRaw) || fieldRaw.match(/^ */)[0].length < entity.indent.length + 4) fail(`Line ${i + 2} must indent fields beneath their entity.`);
          if (/["'`{}\[\]?]/.test(fieldText)) fail(`Line ${i + 2} uses richer field syntax. Edit source directly.`);
          const field = fieldText.match(/^([A-Za-z][A-Za-z0-9_-]*)\s+([A-Za-z_][A-Za-z0-9_-]*)(?:\s+(PK|FK|UK))?$/);
          if (!field) fail(`Line ${i + 2} uses an unsupported field declaration. Edit source directly.`);
          entity.fields.push({type:field[1], name:field[2], key:field[3] || '', raw:fieldRaw});
        }
        if (!closed) fail(`Entity ${entity.id} is missing its closing brace.`);
      }
    }
    validate(model);
  } catch (error) { model.error = error.message; }
  return model;
}

export function serializeErDiagram(model) {
  validate(model);
  return model.rows.map(row => row.kind === 'entity' ? serializeEntity(row.entity) : row.kind === 'relationship' ? serializeRelation(row) : row.raw ?? '').join('\n').replace(/\n*$/, '\n');
}

export function addErEntity(model) {
  let index = 1;
  while (model.entities.some(entity => entity.id === `Entity${index}`)) index++;
  const entity = {id:`Entity${index}`, indent:'    ', block:false, fields:[], headerRaw:undefined, closeRaw:null};
  const relationIndex = model.rows.findIndex(row => row.kind === 'relationship');
  model.rows.splice(relationIndex < 0 ? model.rows.length : relationIndex, 0, {kind:'entity', entity});
  model.entities.push(entity);
  return entity.id;
}

export function updateErEntity(model, id, patch) {
  const entity = model.entities.find(item => item.id === id);
  if (!entity) fail('This entity no longer exists.');
  if (patch.id !== undefined) {
    if (!entityId.test(patch.id) || model.entities.some(item => item.id === patch.id && item !== entity)) fail('Use a unique entity ID with letters, digits, underscores, and hyphens.');
    const previous = entity.id; entity.id = patch.id;
    for (const relation of model.relationships) {
      if (relation.from === previous) relation.from = patch.id;
      if (relation.to === previous) relation.to = patch.id;
    }
  }
  if (patch.fields !== undefined) {
    if (!Array.isArray(patch.fields)) fail('Fields must be provided as a list.');
    const existing = entity.fields;
    entity.fields = patch.fields.map((value, index) => {
      const field = {type:value.type, name:value.name, key:value.key || ''};
      const raw = existing[index];
      field.raw = raw && raw.type === field.type && raw.name === field.name && raw.key === field.key ? raw.raw : undefined;
      return field;
    });
    entity.block = entity.block || entity.fields.length > 0;
  }
  validate(model);
}

export function removeErEntity(model, id) {
  const entity = model.entities.find(item => item.id === id);
  if (!entity) fail('This entity no longer exists.');
  if (model.entities.length <= 1) fail('Keep at least one entity in the ER diagram.');
  model.rows = model.rows.filter(row => row.kind !== 'entity' || row.entity !== entity).filter(row => row.kind !== 'relationship' || row.from !== id && row.to !== id);
  model.entities.splice(model.entities.indexOf(entity), 1);
  model.relationships = model.rows.filter(row => row.kind === 'relationship');
}

export function addErRelationship(model, values = {}) {
  const ids = model.entities.map(entity => entity.id);
  if (ids.length < 2) fail('Add a second entity before creating a relationship.');
  const from = values.from || ids[0], to = values.to || ids.find(id => id !== from) || ids[1];
  if (!ids.includes(from) || !ids.includes(to)) fail('Choose existing entities for both relationship endpoints.');
  const relation = {kind:'relationship', raw:undefined, leading:'    ', from, fromGap:' ', leftCardinality:values.leftCardinality || '||', style:values.style || '--', rightCardinality:values.rightCardinality || 'o{', notation:'', toGap:' ', to, label:values.label || '', labelDelimiter:values.label ? ' : ' : '', tail:''};
  relation.notation = relation.leftCardinality + relation.style + relation.rightCardinality;
  validate({...model, relationships:[...model.relationships, relation]});
  const relations = model.rows.map((row, index) => row.kind === 'relationship' ? index : -1).filter(index => index >= 0);
  const insertion = relations.length ? relations.at(-1) + 1 : Math.max(1, model.rows.findIndex(row => row.kind === 'entity'));
  model.rows.splice(insertion, 0, relation); model.relationships = model.rows.filter(row => row.kind === 'relationship');
  return model.relationships.indexOf(relation);
}

export function updateErRelationship(model, index, patch) {
  const relation = model.relationships[index];
  if (!relation) fail('This relationship no longer exists.');
  const next = {...relation, ...patch};
  if (!model.entities.some(entity => entity.id === next.from) || !model.entities.some(entity => entity.id === next.to)) fail('Choose existing entities for both relationship endpoints.');
  if (!erCardinalityLeft.includes(next.leftCardinality) || !erRelationshipStyles.includes(next.style) || !erCardinalityRight.includes(next.rightCardinality)) fail('Choose supported endpoint cardinalities and identifying style.');
  if (typeof next.label !== 'string' || /[\r\n{}\[\]"'`]/.test(next.label)) fail('Use a plain single-line relationship label.');
  if (next.label && !relation.label) next.labelDelimiter = ' : ';
  next.notation = next.leftCardinality + next.style + next.rightCardinality;
  Object.assign(relation, next); validate(model);
}

export function reverseErRelationship(model, index) {
  const relation = model.relationships[index]; if (!relation) fail('This relationship no longer exists.');
  const from = relation.from; relation.from = relation.to; relation.to = from;
  const toLeft = {'o|':'|o','||':'||','o{':'}o','|{':'}|'}, toRight = {'|o':'o|','||':'||','}o':'o{','}|':'|{'};
  const left = relation.leftCardinality; relation.leftCardinality = toLeft[relation.rightCardinality]; relation.rightCardinality = toRight[left];
  relation.notation = relation.leftCardinality + relation.style + relation.rightCardinality;
  validate(model);
}

export function removeErRelationship(model, index) {
  const relation = model.relationships[index]; if (!relation) fail('This relationship no longer exists.');
  model.rows.splice(model.rows.indexOf(relation), 1); model.relationships = model.rows.filter(row => row.kind === 'relationship');
}

export function moveErRelationship(model, index, delta) {
  const target = index + delta; if (!model.relationships[index] || !model.relationships[target]) return index;
  const a = model.rows.indexOf(model.relationships[index]), b = model.rows.indexOf(model.relationships[target]);
  [model.rows[a], model.rows[b]] = [model.rows[b], model.rows[a]];
  model.relationships = model.rows.filter(row => row.kind === 'relationship');
  return target;
}

export function addErField(model, id) {
  const entity = model.entities.find(item => item.id === id);
  if (!entity) fail('This entity no longer exists.');
  let index = 1;
  while (entity.fields.some(field => field.name === `field${index}`)) index++;
  entity.block = true;
  entity.fields.push({type:'string', name:`field${index}`, key:'', raw:undefined});
  validate(model);
  return entity.fields.length - 1;
}

export function removeErField(model, id, index) {
  const entity = model.entities.find(item => item.id === id);
  if (!entity?.fields[index]) fail('This entity field no longer exists.');
  entity.fields.splice(index, 1);
  validate(model);
}

export function moveErField(model, id, index, delta) {
  const entity = model.entities.find(item => item.id === id), target = index + delta;
  if (!entity?.fields[index] || !entity.fields[target]) return index;
  [entity.fields[index], entity.fields[target]] = [entity.fields[target], entity.fields[index]];
  return target;
}
