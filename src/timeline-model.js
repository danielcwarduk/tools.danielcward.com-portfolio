function fail(message) { throw new Error(message); }

function validate(model) {
  if (!model.events.length) fail('Add at least one event to edit this timeline.');
  for (const event of model.events) {
    if (!event.period.trim()) fail('Enter a time or period for every event.');
    if (!event.label.trim()) fail('Enter a label for every event.');
    if (event.period.includes(':') || /:\s/.test(event.label)) fail('Timeline periods and labels cannot contain a colon followed by a space.');
  }
}

export function parseTimeline(source) {
  const model = {rows: [], events: [], error: null, header: null};
  try {
    let foundHeader = false, foundTitle = false;
    for (const [line, raw] of source.split(/\r?\n/).entries()) {
      const text = raw.trim();
      if (!text || text.startsWith('%%') || text.startsWith('#') || text.startsWith('%')) {
        model.rows.push({kind: 'raw', raw});
        continue;
      }
      if (!foundHeader) {
        const header = text.match(/^timeline(?:\s+(LR|TD))?$/i);
        if (!header) fail('Timeline visual editing requires a plain timeline header. Edit source directly.');
        model.header = {direction: header[1]?.toUpperCase()};
        model.rows.push({kind: 'header', raw});
        foundHeader = true;
        continue;
      }
      const title = text.match(/^title\s+(.+)$/i);
      if (title) {
        if (foundTitle) fail(`Line ${line + 1} has an unsupported duplicate title.`);
        foundTitle = true;
        model.rows.push({kind: 'raw', raw});
        continue;
      }
      if (/^section\b/i.test(text) || /^acc(?:Title|Descr)\b/i.test(text)) {
        fail(`Line ${line + 1} uses timeline syntax outside the visual editor subset. Edit source directly.`);
      }
      const match = text.match(/^([^:#]+?)\s*:\s*(.+)$/);
      if (!match) fail(`Line ${line + 1} uses timeline syntax outside the visual editor subset. Edit source directly.`);
      const event = {kind: 'event', period: match[1].trim(), label: match[2].trim(), raw};
      validate({events: [event]});
      model.rows.push(event);
      model.events.push(event);
    }
    if (!foundHeader) fail('Add a timeline header to enable visual editing.');
    validate(model);
  } catch (error) { model.error = error.message; }
  return model;
}

export function serializeTimeline(model) {
  validate(model);
  return model.rows.map(row => {
    if (row.kind !== 'event' || row.raw !== undefined) return row.raw ?? '';
    return `    ${row.period} : ${row.label}`;
  }).join('\n').replace(/\n*$/, '\n');
}

export function updateTimelineEvent(model, index, patch) {
  const event = model.events[index];
  if (!event) fail('This timeline event no longer exists.');
  const next = {...event, ...patch};
  if (typeof next.period !== 'string' || !next.period.trim()) fail('Enter a time or period for the event.');
  if (typeof next.label !== 'string' || !next.label.trim()) fail('Enter a label for the event.');
  if (next.period.includes(':') || /:\s/.test(next.label)) fail('Timeline periods and labels cannot contain a colon followed by a space.');
  Object.assign(event, next);
  delete event.raw;
  validate(model);
}

export function addTimelineEvent(model) {
  let index = 1;
  const periods = new Set(model.events.map(event => event.period));
  while (periods.has(`Event ${index}`)) index++;
  const event = {kind: 'event', period: `Event ${index}`, label: 'Describe event'};
  model.rows.push(event);
  model.events.push(event);
  return model.events.length - 1;
}

export function removeTimelineEvent(model, index) {
  const event = model.events[index];
  if (!event) fail('This timeline event no longer exists.');
  if (model.events.length <= 1) fail('A timeline must keep at least one event.');
  model.rows.splice(model.rows.indexOf(event), 1);
  model.events.splice(index, 1);
}

export function moveTimelineEvent(model, index, delta) {
  const target = index + delta;
  if (!model.events[index] || !model.events[target]) return index;
  const fromRow = model.rows.indexOf(model.events[index]);
  const toRow = model.rows.indexOf(model.events[target]);
  [model.rows[fromRow], model.rows[toRow]] = [model.rows[toRow], model.rows[fromRow]];
  [model.events[index], model.events[target]] = [model.events[target], model.events[index]];
  return target;
}
