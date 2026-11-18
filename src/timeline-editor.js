import {addTimelineEvent, moveTimelineEvent, parseTimeline, removeTimelineEvent, serializeTimeline, updateTimelineEvent} from './timeline-model.js';
import {bindContextShortcuts, focusContextField} from './context-focus.js';

export function createTimelineEditor(api) {
  const {canvas, scene} = api;
  let active = false, editable = false, model = null, selection = null, actionRevision = 0;
  const current = () => api.source();

  function prepare(text, isTimeline) {
    active = isTimeline;
    editable = false;
    model = isTimeline ? parseTimeline(text) : null;
    if (!active) selection = null;
    return model;
  }

  function invalidate() { editable = false; actionRevision++; }

  function commit(change) {
    if (!editable) throw Error('Wait for the current timeline preview before editing.');
    const next = structuredClone(model);
    change(next);
    const text = serializeTimeline(next);
    if (text !== current()) api.setSource(text);
  }

  function settle(action) {
    const revision = ++actionRevision, deadline = performance.now() + 5000;
    const attempt = () => {
      if (revision !== actionRevision || !active) return;
      if (performance.now() > deadline) { api.status('Wait for the preview before continuing.'); return; }
      if (!editable) { if (model?.error) return; setTimeout(attempt, 25); return; }
      if (!api.flushEdits()) { api.status('Finish the current context edit before continuing.'); return; }
      if (!editable) { setTimeout(attempt, 25); return; }
      action();
    };
    attempt();
  }

  function paint() {
    for (const el of scene.querySelectorAll('[data-timeline-event]')) {
      const chosen = Number(el.dataset.timelineEvent) === selection;
      el.classList.toggle('timeline-selected', chosen);
      if (el.getAttribute('role') === 'button') el.setAttribute('aria-pressed', String(chosen));
    }
    const status = canvas.querySelector('#selection');
    if (status) status.textContent = selection === null ? 'No timeline event selected' : `Timeline event: ${model.events[selection]?.period || 'event ' + (selection + 1)}`;
    api.updateHints();
  }

  function attach() {
    if (!active) return;
    editable = !model.error;
    if (!editable) { selection = null; paint(); return; }
    if (selection !== null && !model.events[selection]) selection = null;
    const periods = scene.querySelectorAll('.taskWrapper > .timeline-node');
    const labels = scene.querySelectorAll('.eventWrapper > .timeline-node');
    if (periods.length !== model.events.length || labels.length !== model.events.length) {
      editable = false;
      model.error = 'Timeline events could not be matched to the source. Edit source directly.';
      paint();
      return;
    }
    for (const [index, el] of [...periods, ...labels].entries()) {
      const eventIndex = index % model.events.length;
      el.dataset.timelineEvent = String(eventIndex);
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', `Edit timeline event ${model.events[eventIndex].period}: ${model.events[eventIndex].label}`);
    }
    paint();
  }

  function hit(element) {
    const item = element?.closest?.('[data-timeline-event]');
    return item ? Number(item.dataset.timelineEvent) : null;
  }

  function remove() {
    if (selection === null) return;
    const index = selection;
    try {
      commit(next => removeTimelineEvent(next, index));
      selection = Math.min(index, model.events.length - 2);
      api.hideMenu();
      paint();
    } catch (error) { api.status(error.message); }
  }

  function add() {
    try { commit(next => { selection = addTimelineEvent(next); }); api.fit(); paint(); }
    catch (error) { api.status(error.message); }
  }

  function open(x, y, field = 'label') {
    if (!editable) return;
    if (selection === null) { api.menu([['＋ Add event · N', () => add()]], x, y); return; }
    const index = selection, item = model.events[index], key = 'timeline-event:' + index;
    const previous = api.menuElement.querySelector('.context-editor');
    if (!api.menuElement.hidden && previous?.dataset.editorKey === key) { focusContextField(previous, field); return; }
    const root = document.createElement('div');
    root.className = 'context-editor timeline-context';
    root.dataset.editorKey = key;
    bindContextShortcuts(root);
    let session, expectedSource = current();
    const fields = {};
    function actionError(error) {
      const feedback = root.querySelector('.autosave-feedback');
      if (feedback) feedback.hidden = false;
      root.querySelector('.error').textContent = error.message;
    }
    function save(change) {
      if (current() !== expectedSource) throw Error('The diagram changed. Reopen this event to edit its current version.');
      commit(change);
      expectedSource = current();
    }
    root.append(api.contextHeader('Timeline event', 'Delete event', () => session, () => { selection = index; remove(); }));
    root.querySelector('.delete-icon').disabled = model.events.length <= 1;
    for (const [name, title, value] of [['period', 'Time / period', item.period], ['label', 'Event label', item.label]]) {
      const label = document.createElement('label');
      label.textContent = title;
      const input = document.createElement('input');
      input.name = name;
      input.value = value;
      input.autocomplete = 'off';
      input.addEventListener('input', () => session.change());
      label.append(input);
      fields[name] = input;
      root.append(label);
    }
    const row = document.createElement('div');
    row.className = 'timeline-actions';
    for (const [title, delta] of [['Move earlier', -1], ['Move later', 1]]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = title;
      button.disabled = index + delta < 0 || index + delta >= model.events.length;
      button.onclick = () => settle(() => {
        if (session.dirty) return;
        try {
          commit(next => { selection = moveTimelineEvent(next, index, delta); });
          api.hideMenu();
          canvas.focus();
        } catch (error) { actionError(error); }
      });
      row.append(button);
    }
    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'timeline-add';
    addButton.textContent = '＋ Add event';
    addButton.onclick = () => settle(() => { if (!session.dirty) { api.hideMenu(); add(); } });
    row.append(addButton);
    root.append(row);
    session = api.makeContextSave(root, () => save(next => updateTimelineEvent(next, index, {period: fields.period.value, label: fields.label.value})));
    session.refresh = () => {};
    api.showContext(root, x, y);
    focusContextField(root, field);
    paint();
  }

  function openAtSelection(field = 'label') {
    const rect = canvas.getBoundingClientRect();
    open(rect.left + 40, rect.top + 40, field);
  }

  function stop(event) { event.preventDefault(); event.stopImmediatePropagation(); }

  for (const type of ['click', 'dblclick', 'contextmenu']) canvas.addEventListener(type, event => {
    if (!active || event.target.closest('.zoom-controls,#edge-reverse')) return;
    stop(event);
    if (!editable) return;
    canvas.focus();
    const index = hit(event.target);
    if (type === 'click') settle(() => { selection = index; paint(); if (index === null) api.hideMenu(); });
    else settle(() => { selection = index; paint(); open(event.clientX, event.clientY); });
  }, true);

  canvas.addEventListener('keydown', event => {
    if (!active || event.ctrlKey || event.metaKey || event.key === 'Tab' || event.key === 'F1') return;
    const item = event.target.closest?.('.timeline-node[data-timeline-event]');
    if (item && event.key === ' ') { stop(event); selection = Number(item.dataset.timelineEvent); paint(); return; }
    if (item && event.key === 'Enter') { stop(event); selection = Number(item.dataset.timelineEvent); paint(); settle(() => openAtSelection()); return; }
    if (event.target !== canvas && !item) return;
    const key = event.key.toLowerCase();
    if (event.key === 'Escape') { stop(event); selection = null; api.hideMenu(); paint(); return; }
    if (!editable) return;
    if (key === 'n') { stop(event); settle(add); return; }
    if (key === 'e' || key === 'q' || event.key === 'Enter' && selection !== null) { stop(event); settle(() => openAtSelection()); return; }
    if (event.key === 'Delete' || event.key === 'Backspace' || key === 'x') { stop(event); settle(remove); return; }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      stop(event);
      if (model.events.length) selection = Math.max(0, Math.min(model.events.length - 1, (selection ?? 0) + (event.key === 'ArrowUp' ? -1 : 1)));
      paint();
    }
  }, true);

  function hints({focus, control, space}) {
    if (!active || !['canvas', 'context'].includes(focus)) return null;
    if (focus === 'context') return {mode: 'Edit timeline event', keys: [['E', 'Label'], ['Tab', 'Next field'], ['Esc', 'Close']]};
    if (control) return {mode: 'History', keys: [['Z', 'Undo'], ['Y', 'Redo']]};
    if (space) return {mode: 'Space · Pan', keys: [['W A S D', 'Pan canvas']]};
    return {mode: selection === null ? 'Timeline' : 'Timeline event', keys: [['N', 'New event'], ['Q', 'Open menu'], ...(selection !== null ? [['E', 'Edit event'], ['↑ / ↓', 'Choose event'], ['X / Del', 'Delete event']] : []), ['F1', 'Shortcuts']]};
  }

  return {
    prepare, attach, invalidate, hints,
    get active() { return active; },
    get editable() { return editable; },
    get error() { return model?.error; },
    cancel() { actionRevision++; selection = null; paint(); }
  };
}
