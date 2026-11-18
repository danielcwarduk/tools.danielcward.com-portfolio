const identifier = /^[A-Za-z_][A-Za-z0-9_]*$/;
const pseudo = '[*]';
function fail(message) { throw new Error(message); }

function refreshStates(model) {
  const declared = new Set(model.rows.filter(row => row.kind === 'state').map(row => row.id));
  const ids = [...declared];
  for (const edge of model.transitions) for (const id of [edge.from, edge.to]) if (id !== pseudo && !ids.includes(id)) ids.push(id);
  model.states = ids.map(id => ({id, declared: declared.has(id)}));
}

function validate(model) {
  refreshStates(model);
  if (!model.states.length) fail('Keep at least one named state in the diagram.');
  const seen = new Set();
  for (const row of model.rows) if (row.kind === 'state') {
    if (!identifier.test(row.id) || row.id === 'end') fail('Use state IDs with letters, digits and underscores.');
    if (seen.has(row.id)) fail('State declarations must use unique IDs.');
    seen.add(row.id);
  }
  for (const edge of model.transitions) {
    for (const id of [edge.from, edge.to]) if (id !== pseudo && !identifier.test(id)) fail('Use state IDs with letters, digits and underscores.');
    if (edge.from === pseudo && edge.to === pseudo) fail('A transition must connect a named state to a start or end state.');
    if (edge.label.includes('\n') || edge.label.includes('\r')) fail('Transition labels must fit on one line.');
  }
}

export function parseStateDiagram(source) {
  const model = {rows: [], states: [], transitions: [], error: null, header: null};
  try {
    let foundHeader = false;
    for (const [line, raw] of source.split(/\r?\n/).entries()) {
      const text = raw.trim();
      if (!text || text.startsWith('%%') || text.startsWith('#')) {
        model.rows.push({kind: 'raw', raw});
        continue;
      }
      if (!foundHeader) {
        const header = text.match(/^stateDiagram-v2$/i);
        if (!header) fail('Visual state editing requires a plain stateDiagram-v2 header. Edit source directly.');
        model.header = {raw};
        model.rows.push({kind: 'header', raw});
        foundHeader = true;
        continue;
      }
      const declaration = text.match(/^state\s+([A-Za-z_][A-Za-z0-9_]*)$/);
      if (declaration) {
        const row = {kind: 'state', id: declaration[1], raw};
        model.rows.push(row);
        continue;
      }
      const transition = text.match(/^([A-Za-z_][A-Za-z0-9_]*|\[\*\])\s*-->\s*([A-Za-z_][A-Za-z0-9_]*|\[\*\])(?:\s*:\s*(.*))?$/);
      if (!transition) fail(`Line ${line + 1} uses state syntax outside the visual editor subset. Edit source directly.`);
      const edge = {kind: 'transition', from: transition[1], to: transition[2], label: transition[3] || '', raw};
      if (edge.from === pseudo && edge.to === pseudo) fail(`Line ${line + 1} connects two pseudo states, which cannot be edited safely.`);
      model.rows.push(edge);
      model.transitions.push(edge);
    }
    if (!foundHeader) fail('Add a stateDiagram-v2 header to enable visual editing.');
    validate(model);
  } catch (error) { model.error = error.message; }
  return model;
}

export function serializeStateDiagram(model) {
  validate(model);
  return model.rows.map(row => {
    if (row.kind === 'state' && row.raw === undefined) return `    state ${row.id}`;
    if (row.kind === 'transition' && row.raw === undefined) return `    ${row.from} --> ${row.to}${row.label ? ': ' + row.label : ''}`;
    return row.raw ?? '';
  }).join('\n').replace(/\n*$/, '\n');
}

export function addState(model) {
  let index = 1;
  while (model.states.some(state => state.id === `State${index}`)) index++;
  const row = {kind: 'state', id: `State${index}`};
  model.rows.push(row);
  refreshStates(model);
  return row.id;
}

export function updateState(model, id, nextId) {
  const state = model.states.find(item => item.id === id);
  if (!state) fail('This state no longer exists.');
  if (!identifier.test(nextId) || nextId === 'end' || model.states.some(item => item.id === nextId && item.id !== id)) fail('Use a unique state ID with letters, digits and underscores.');
  for (const row of model.rows) {
    if (row.kind === 'state' && row.id === id) { row.id = nextId; delete row.raw; }
    if (row.kind === 'transition') {
      if (row.from === id) row.from = nextId;
      if (row.to === id) row.to = nextId;
      if (row.from === nextId || row.to === nextId) delete row.raw;
    }
  }
  refreshStates(model);
}

export function removeState(model, id) {
  if (!model.states.some(state => state.id === id)) fail('This state no longer exists.');
  model.rows = model.rows.filter(row => !(row.kind === 'state' && row.id === id) && !(row.kind === 'transition' && (row.from === id || row.to === id)));
  model.transitions = model.rows.filter(row => row.kind === 'transition');
  refreshStates(model);
  if (!model.states.length) fail('Keep at least one named state in the diagram.');
}

export function addStateTransition(model, {from, to, label = ''}) {
  const edge = {kind: 'transition', from, to, label};
  model.transitions.push(edge);
  model.rows.push(edge);
  validate(model);
  return model.transitions.length - 1;
}

export function updateStateTransition(model, index, patch) {
  const edge = model.transitions[index];
  if (!edge) fail('This transition no longer exists.');
  const next = {...edge, ...patch};
  if ((next.from !== pseudo && !model.states.some(state => state.id === next.from)) || (next.to !== pseudo && !model.states.some(state => state.id === next.to))) fail('Choose existing states or a start/end state.');
  if (next.from === pseudo && next.to === pseudo) fail('A transition must connect a named state to a start or end state.');
  if (typeof next.label !== 'string' || /[\r\n]/.test(next.label)) fail('Transition labels must fit on one line.');
  Object.assign(edge, next);
  delete edge.raw;
  validate(model);
}

export function removeStateTransition(model, index) {
  const edge = model.transitions[index];
  if (!edge) fail('This transition no longer exists.');
  const formerStates = [...model.states];
  model.rows.splice(model.rows.indexOf(edge), 1);
  model.transitions.splice(index, 1);
  const connected = new Set(model.transitions.flatMap(item => [item.from, item.to]));
  for (const state of formerStates) if (!connected.has(state.id) && !model.rows.some(row => row.kind === 'state' && row.id === state.id)) model.rows.push({kind: 'state', id: state.id});
  refreshStates(model);
}

export function moveStateTransition(model, index, delta) {
  const target = index + delta;
  if (!model.transitions[index] || !model.transitions[target]) return index;
  const fromRow = model.rows.indexOf(model.transitions[index]);
  const toRow = model.rows.indexOf(model.transitions[target]);
  [model.rows[fromRow], model.rows[toRow]] = [model.rows[toRow], model.rows[fromRow]];
  [model.transitions[index], model.transitions[target]] = [model.transitions[target], model.transitions[index]];
  return target;
}
