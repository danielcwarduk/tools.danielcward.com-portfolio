const numberPattern = String.raw`(?:\d+(?:\.\d*)?|\.\d+)`;
const encodeLabel = value => value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
const decodeLabel = value => value.replace(/\\([\\"])/g, '$1');

function fail(message) {
  throw new Error(message);
}

function validate(model) {
  if (!model.slices.length) fail('Add at least one slice to edit this pie chart.');
  const labels = new Set();
  for (const slice of model.slices) {
    if (!slice.label.trim()) fail('Enter a label for every slice.');
    if (labels.has(slice.label)) fail('Pie slice labels must be unique for visual editing.');
    labels.add(slice.label);
    if (!Number.isFinite(slice.value) || slice.value < 0) fail('Pie values must be zero or greater.');
  }
  const total = model.slices.reduce((sum, slice) => sum + slice.value, 0);
  if (!Number.isFinite(total) || total <= 0) fail('Pie values must add up to more than zero.');
}

export function parsePie(source) {
  const model = {events: [], slices: [], error: null, header: null};
  try {
    let foundHeader = false;
    let foundTitle = false;
    for (const [line, raw] of source.split(/\r?\n/).entries()) {
      const trimmed = raw.trim();
      if (!trimmed || trimmed.startsWith('%%')) {
        model.events.push({kind: 'raw', raw});
        continue;
      }
      if (!foundHeader) {
        const header = trimmed.match(/^pie(?:\s+(showData))?(?:\s+title\s+(.+))?$/);
        if (!header) fail('Pie visual editing requires a plain pie header. Edit source directly.');
        model.header = {showData: !!header[1], inlineTitle: header[2]};
        model.events.push({kind: 'header', raw});
        foundHeader = true;
        continue;
      }
      const title = trimmed.match(/^title\s+(.+)$/);
      if (title) {
        if (foundTitle || model.header.inlineTitle) fail(`Line ${line + 1} has an unsupported duplicate title.`);
        foundTitle = true;
        model.events.push({kind: 'raw', raw});
        continue;
      }
      const slice = trimmed.match(new RegExp(String.raw`^"((?:\\.|[^"\\])*)"\s*:\s*(${numberPattern})$`));
      if (!slice) fail(`Line ${line + 1} uses pie syntax outside the visual editor subset. Edit source directly.`);
      const value = Number(slice[2]);
      if (!Number.isFinite(value) || value < 0) fail(`Line ${line + 1} has an invalid pie value.`);
      const item = {kind: 'slice', label: decodeLabel(slice[1]), value, raw};
      model.events.push(item);
      model.slices.push(item);
    }
    if (!foundHeader) fail('Add a pie header to enable visual editing.');
    validate(model);
  } catch (error) {
    model.error = error.message;
  }
  return model;
}

export function serializePie(model) {
  validate(model);
  return model.events.map(event => {
    if (event.kind !== 'slice' || event.raw !== undefined) return event.raw ?? '';
    return `    "${encodeLabel(event.label)}" : ${String(event.value)}`;
  }).join('\n').replace(/\n*$/, '\n');
}

export function updatePieSlice(model, index, patch) {
  const slice = model.slices[index];
  if (!slice) fail('This pie slice no longer exists.');
  const next = {...slice, ...patch};
  if (typeof next.label !== 'string' || !next.label.trim()) fail('Enter a label for the slice.');
  if (!Number.isFinite(Number(next.value)) || Number(next.value) < 0) fail('Enter a value of zero or greater.');
  next.value = Number(next.value);
  Object.assign(slice, next);
  delete slice.raw;
  validate(model);
}

export function addPieSlice(model) {
  let index = 1;
  const labels = new Set(model.slices.map(slice => slice.label));
  while (labels.has(`Slice ${index}`)) index++;
  const slice = {kind: 'slice', label: `Slice ${index}`, value: 1};
  model.events.push(slice);
  model.slices.push(slice);
  return model.slices.length - 1;
}

export function removePieSlice(model, index) {
  const slice = model.slices[index];
  if (!slice) fail('This pie slice no longer exists.');
  if (model.slices.length <= 1) fail('A pie chart must keep at least one slice.');
  model.events.splice(model.events.indexOf(slice), 1);
  model.slices.splice(index, 1);
}

export function movePieSlice(model, index, delta) {
  const target = index + delta;
  if (!model.slices[index] || !model.slices[target]) return index;
  const fromEvent = model.events.indexOf(model.slices[index]);
  const toEvent = model.events.indexOf(model.slices[target]);
  [model.events[fromEvent], model.events[toEvent]] = [model.events[toEvent], model.events[fromEvent]];
  [model.slices[index], model.slices[target]] = [model.slices[target], model.slices[index]];
  return target;
}
