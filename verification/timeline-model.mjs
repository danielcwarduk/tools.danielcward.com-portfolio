import assert from 'node:assert/strict';
import {addTimelineEvent, moveTimelineEvent, parseTimeline, removeTimelineEvent, serializeTimeline, updateTimelineEvent} from '../src/timeline-model.js';
import {diagramTemplates, diagramType} from '../src/diagram-types.js';

const base = diagramTemplates.find(template => template.id === 'timeline').source;
function test(name, fn) { fn(); console.log('PASS', name); }

test('timeline template is visual and roundtrips unchanged', () => {
  const model = parseTimeline(base);
  assert.equal(model.error, null);
  assert.equal(serializeTimeline(model), base);
  assert.equal(diagramType(base), 'timeline');
  assert.equal(diagramTemplates.find(template => template.id === 'timeline').visual, true);
});

test('title, direction, comments and whitespace survive edits', () => {
  const source = '%% retained\ntimeline LR\n    title History\n    2020 : First event\n    # note\n    2021 : Second event\n';
  const model = parseTimeline(source);
  assert.equal(model.error, null);
  updateTimelineEvent(model, 0, {period: '2020 Q1', label: 'Updated event'});
  const output = serializeTimeline(model);
  assert(output.startsWith('%% retained\ntimeline LR\n    title History\n'));
  assert(output.includes('2020 Q1 : Updated event'));
  assert(output.includes('    # note\n'));
  assert.equal(parseTimeline(output).error, null);
});

test('events can be added, edited, reordered and removed', () => {
  const model = parseTimeline(base);
  const added = addTimelineEvent(model);
  assert.equal(model.events[added].period, 'Event 1');
  assert.equal(moveTimelineEvent(model, added, -1), added - 1);
  updateTimelineEvent(model, added - 1, {period: 'Next', label: 'New milestone'});
  removeTimelineEvent(model, added - 1);
  const output = serializeTimeline(model);
  assert(!output.includes('New milestone'));
  assert.equal(parseTimeline(output).error, null);
});

test('invalid labels, periods and deleting the final event are rejected', () => {
  const model = parseTimeline(base);
  assert.throws(() => updateTimelineEvent(model, 0, {label: ''}), /label/);
  assert.throws(() => updateTimelineEvent(model, 0, {period: '2020: Q1'}), /colon/);
  assert.throws(() => updateTimelineEvent(model, 0, {label: 'Event: detail'}), /colon/);
  assert.throws(() => removeTimelineEvent(parseTimeline('timeline\n2020 : One\n'), 0), /at least one event/);
});

test('sections, accessibility directives and malformed rows fall back safely', () => {
  for (const source of [
    'timeline\nsection Delivery\n  2020 : Build\n',
    'timeline\naccTitle: Summary\n2020 : Build\n',
    'timeline\n2020 : Build\nthis is not a timeline event\n',
    'timeline\n',
  ]) assert(parseTimeline(source).error);
});
