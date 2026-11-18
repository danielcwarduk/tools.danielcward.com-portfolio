import {addPieSlice, movePieSlice, parsePie, removePieSlice, serializePie, updatePieSlice} from './pie-model.js';
import {bindContextShortcuts, focusContextField} from './context-focus.js';

export function createPieEditor(api) {
  const {canvas, scene} = api;
  let active = false, editable = false, model = null, selection = null, actionRevision = 0;
  const current = () => api.source();

  function prepare(text, isPie) {
    active = isPie;
    editable = false;
    model = isPie ? parsePie(text) : null;
    if (!active) selection = null;
    return model;
  }

  function invalidate() {
    editable = false;
    actionRevision++;
  }

  function commit(change) {
    if (!editable) throw Error('Wait for the current pie preview before editing.');
    const next = structuredClone(model);
    change(next);
    const text = serializePie(next);
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
    for (const el of scene.querySelectorAll('[data-pie-slice]')) {
      const chosen = Number(el.dataset.pieSlice) === selection;
      el.classList.toggle('pie-selected', chosen);
      if (el.matches('.legend')) el.setAttribute('aria-pressed', String(chosen));
    }
    const status = canvas.querySelector('#selection');
    if (status) status.textContent = selection === null ? 'No pie slice selected' : `Pie slice: ${model.slices[selection]?.label || 'slice ' + (selection + 1)}`;
    api.updateHints();
  }

  function attach() {
    if (!active) return;
    editable = !model.error;
    if (!editable) { selection = null; paint(); return; }
    if (selection !== null && !model.slices[selection]) selection = null;
    const legends = scene.querySelectorAll('.legend');
    if (legends.length !== model.slices.length) {
      editable = false;
      model.error = 'Pie slices could not be matched to the source. Edit source directly.';
      paint();
      return;
    }
    legends.forEach((legend, index) => {
      legend.dataset.pieSlice = String(index);
      legend.setAttribute('role', 'button');
      legend.setAttribute('tabindex', '0');
      legend.setAttribute('aria-label', `Edit ${model.slices[index].label}, value ${model.slices[index].value}`);
    });
    const total = model.slices.reduce((sum, slice) => sum + slice.value, 0);
    const visible = model.slices.map((slice, index) => ({slice, index})).filter(({slice}) => slice.value / total * 100 >= 1);
    const arcs = scene.querySelectorAll('.pieCircle');
    if (arcs.length !== visible.length) {
      editable = false;
      model.error = 'Pie slices could not be matched to the source. Edit source directly.';
      paint();
      return;
    }
    arcs.forEach((arc, index) => { arc.dataset.pieSlice = String(visible[index].index); });
    paint();
  }

  function hit(element) {
    if (!element) return null;
    const item = element.closest?.('[data-pie-slice]');
    return item ? Number(item.dataset.pieSlice) : null;
  }

  function remove() {
    if (selection === null) return;
    const index = selection;
    try {
      commit(next => removePieSlice(next, index));
      selection = Math.min(index, model.slices.length - 2);
      api.hideMenu();
      paint();
    } catch (error) { api.status(error.message); }
  }

  function add() {
    try { commit(next => { selection = addPieSlice(next); }); api.fit(); paint(); }
    catch (error) { api.status(error.message); }
  }

  function open(x, y, field = 'label') {
    if (!editable) return;
    if (selection === null) {
      api.menu([['＋ Add slice · N', () => add()]], x, y);
      return;
    }
    const index = selection, item = model.slices[index], key = 'pie-slice:' + index;
    const previous = api.menuElement.querySelector('.context-editor');
    if (!api.menuElement.hidden && previous?.dataset.editorKey === key) { focusContextField(previous, field); return; }
    const root = document.createElement('div');
    root.className = 'context-editor pie-context';
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
      if (current() !== expectedSource) throw Error('The diagram changed. Reopen this slice to edit its current version.');
      commit(change);
      expectedSource = current();
    }
    root.append(api.contextHeader('Pie slice', 'Delete slice', () => session, () => { selection = index; remove(); }));
    root.querySelector('.delete-icon').disabled = model.slices.length <= 1;
    for (const [name, title, value] of [['label', 'Label', item.label], ['value', 'Value', String(item.value)]]) {
      const label = document.createElement('label');
      label.textContent = title;
      const input = document.createElement('input');
      input.name = name;
      input.value = value;
      input.autocomplete = 'off';
      if (name === 'value') { input.type = 'number'; input.min = '0'; input.step = 'any'; }
      input.addEventListener('input', () => session.change());
      label.append(input);
      fields[name] = input;
      root.append(label);
    }
    const row = document.createElement('div');
    row.className = 'pie-actions';
    for (const [title, delta] of [['Move earlier', -1], ['Move later', 1]]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = title;
      button.disabled = index + delta < 0 || index + delta >= model.slices.length;
      button.onclick = () => settle(() => {
        if (session.dirty) return;
        try {
          commit(next => { selection = movePieSlice(next, index, delta); });
          api.hideMenu();
          canvas.focus();
        } catch (error) { actionError(error); }
      });
      row.append(button);
    }
    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'pie-add';
    addButton.textContent = '＋ Add slice';
    addButton.onclick = () => settle(() => { if (!session.dirty) { api.hideMenu(); add(); } });
    row.append(addButton);
    root.append(row);
    session = api.makeContextSave(root, () => save(next => updatePieSlice(next, index, {label: fields.label.value, value: fields.value.value})));
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
    if (type === 'click') {
      settle(() => { selection = index; paint(); if (index === null) api.hideMenu(); });
    } else {
      settle(() => { selection = index; paint(); open(event.clientX, event.clientY); });
    }
  }, true);

  canvas.addEventListener('keydown', event => {
    if (!active || event.ctrlKey || event.metaKey || event.key === 'Tab' || event.key === 'F1') return;
    const legend = event.target.closest?.('.legend[data-pie-slice]');
    if (legend && ['Enter', ' '].includes(event.key)) { stop(event); selection = Number(legend.dataset.pieSlice); paint(); return; }
    if (event.target !== canvas && !legend) return;
    const key = event.key.toLowerCase();
    if (event.key === 'Escape') { stop(event); selection = null; api.hideMenu(); paint(); return; }
    if (!editable) return;
    if (key === 'n') { stop(event); settle(add); return; }
    if (key === 'e' || key === 'q' || event.key === 'Enter' && selection !== null) { stop(event); settle(() => openAtSelection(key === 'e' ? 'label' : 'label')); return; }
    if (event.key === 'Delete' || event.key === 'Backspace' || key === 'x') { stop(event); settle(remove); return; }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      stop(event);
      if (model.slices.length) selection = Math.max(0, Math.min(model.slices.length - 1, (selection ?? 0) + (event.key === 'ArrowUp' ? -1 : 1)));
      paint();
    }
  }, true);

  function hints({focus, control, space}) {
    if (!active || !['canvas', 'context'].includes(focus)) return null;
    if (focus === 'context') return {mode: 'Edit pie slice', keys: [['E', 'Label'], ['Tab', 'Next field'], ['Esc', 'Close']]};
    if (control) return {mode: 'History', keys: [['Z', 'Undo'], ['Y', 'Redo']]};
    if (space) return {mode: 'Space · Pan', keys: [['W A S D', 'Pan canvas']]};
    return {mode: selection === null ? 'Pie chart' : 'Pie slice', keys: [['N', 'New slice'], ...(selection !== null ? [['E', 'Edit slice'], ['↑ / ↓', 'Choose slice'], ['X / Del', 'Delete slice']] : []), ['F1', 'Shortcuts']]};
  }

  return {
    prepare, attach, invalidate, hints,
    get active() { return active; },
    get editable() { return editable; },
    get error() { return model?.error; },
    cancel() { actionRevision++; selection = null; paint(); }
  };
}
