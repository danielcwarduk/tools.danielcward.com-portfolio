import {addState, addStateTransition, moveStateTransition, parseStateDiagram, removeState, removeStateTransition, serializeStateDiagram, updateState, updateStateTransition} from './state-model.js';
import {bindContextShortcuts, focusContextField} from './context-focus.js';

const PSEUDO = '[*]';

export function createStateEditor(api) {
  const {canvas, scene} = api;
  let active = false, editable = false, model = null, selection = null, actionRevision = 0;
  const current = () => api.source();

  function prepare(text, isState) {
    active = isState;
    editable = false;
    model = isState ? parseStateDiagram(text) : null;
    if (!active) selection = null;
    return model;
  }

  function invalidate() { editable = false; actionRevision++; }

  function commit(change) {
    if (!editable) throw Error('Wait for the current state diagram preview before editing.');
    const next = structuredClone(model);
    change(next);
    const text = serializeStateDiagram(next);
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
    for (const el of scene.querySelectorAll('[data-state-node]')) {
      const selected = selection?.kind === 'state' && selection.id === el.dataset.stateNode;
      el.classList.toggle('state-selected', selected);
      if (el.getAttribute('role') === 'button') el.setAttribute('aria-pressed', String(selected));
    }
    for (const el of scene.querySelectorAll('[data-state-transition]')) {
      const selected = selection?.kind === 'transition' && selection.index === Number(el.dataset.stateTransition);
      el.classList.toggle('state-transition-selected', selected);
      if (el.getAttribute('role') === 'button') el.setAttribute('aria-pressed', String(selected));
    }
    const status = canvas.querySelector('#selection');
    if (status) status.textContent = selection?.kind === 'state' ? 'State: ' + selection.id : selection?.kind === 'transition' ? 'Transition ' + (selection.index + 1) : 'No state item selected';
    api.updateHints();
  }

  function attach() {
    if (!active) return;
    editable = !model.error;
    if (!editable) { selection = null; paint(); return; }
    if (selection?.kind === 'state' && !model.states.some(state => state.id === selection.id)) selection = null;
    if (selection?.kind === 'transition' && !model.transitions[selection.index]) selection = null;
    const allGroups = [...scene.querySelectorAll('g.node')];
    const named = allGroups.filter(group => group.classList.contains('statediagram-state'));
    const pseudoGroups = allGroups.filter(group => group.id.includes('-state-root_start-') || group.id.includes('-state-root_end-'));
    if (named.length !== model.states.length) {
      editable = false;
      model.error = 'States could not be matched to the source. Edit source directly.';
      paint();
      return;
    }
    for (const state of model.states) {
      const group = named.find(el => el.id.startsWith(scene.querySelector('svg')?.id + '-state-' + state.id + '-'));
      if (!group) { editable = false; model.error = 'States could not be matched to the source. Edit source directly.'; paint(); return; }
      group.dataset.stateNode = state.id;
      group.setAttribute('role', 'button');
      group.setAttribute('tabindex', '0');
      group.setAttribute('aria-label', `Edit state ${state.id}`);
    }
    const edges = [...scene.querySelectorAll('path.transition')];
    if (edges.length !== model.transitions.length) {
      editable = false;
      model.error = 'Transitions could not be matched to the source. Edit source directly.';
      paint();
      return;
    }
    edges.forEach((edge, index) => {
      edge.dataset.stateTransition = String(index);
      const label = model.transitions[index].label || `Transition ${index + 1}`;
      edge.setAttribute('aria-label', `Edit ${label}`);
      const hit = edge.cloneNode(false);
      hit.removeAttribute('id');
      hit.removeAttribute('marker-end');
      hit.setAttribute('class', 'state-transition-hit');
      hit.dataset.stateTransition = String(index);
      edge.after(hit);
    });
    const startIndexes = model.transitions.flatMap((edge, index) => edge.from === PSEUDO ? [index] : []);
    const endIndexes = model.transitions.flatMap((edge, index) => edge.to === PSEUDO ? [index] : []);
    const starts = pseudoGroups.filter(group => group.id.includes('-state-root_start-'));
    const ends = pseudoGroups.filter(group => group.id.includes('-state-root_end-'));
    if (starts.length !== startIndexes.length || ends.length !== endIndexes.length) {
      editable = false;
      model.error = 'Start/end states could not be matched to the source. Edit source directly.';
      paint();
      return;
    }
    starts.forEach((group, index) => { group.dataset.stateTransition = String(startIndexes[index]); group.setAttribute('role', 'button'); group.setAttribute('tabindex', '0'); });
    ends.forEach((group, index) => { group.dataset.stateTransition = String(endIndexes[index]); group.setAttribute('role', 'button'); group.setAttribute('tabindex', '0'); });
    const labels = [...scene.querySelectorAll('g.edgeLabel')].filter(label => label.textContent.trim());
    const labeledIndexes = model.transitions.flatMap((edge, index) => edge.label ? [index] : []);
    if (labels.length !== labeledIndexes.length) {
      editable = false;
      model.error = 'Transition labels could not be matched to the source. Edit source directly.';
      paint();
      return;
    }
    labels.forEach((label, index) => {
      label.dataset.stateTransition = String(labeledIndexes[index]);
      label.setAttribute('role', 'button');
      label.setAttribute('tabindex', '0');
      label.setAttribute('aria-label', `Edit transition ${model.transitions[labeledIndexes[index]].label}`);
    });
    paint();
  }

  function hit(element) {
    const transition = element?.closest?.('[data-state-transition]');
    if (transition) return {kind: 'transition', index: Number(transition.dataset.stateTransition)};
    const node = element?.closest?.('[data-state-node]');
    return node ? {kind: 'state', id: node.dataset.stateNode} : null;
  }

  function remove() {
    if (!selection) return;
    const item = {...selection};
    try {
      commit(next => item.kind === 'state' ? removeState(next, item.id) : removeStateTransition(next, item.index));
      selection = null;
      api.hideMenu();
      paint();
    } catch (error) { api.status(error.message); }
  }

  function addNewState() {
    try {
      commit(next => {
        const id = addState(next);
        const from = selection?.kind === 'state' && next.states.some(state => state.id === selection.id) ? selection.id : next.states.find(state => state.id !== id)?.id;
        if (from) addStateTransition(next, {from, to: id});
        selection = {kind: 'state', id};
      });
      api.fit(); paint();
    }
    catch (error) { api.status(error.message); }
  }

  function addTransition({from, to, label = ''}) {
    try { commit(next => { selection = {kind: 'transition', index: addStateTransition(next, {from, to, label})}; }); api.hideMenu(); api.fit(); paint(); }
    catch (error) { api.status(error.message); }
  }

  function openTransition(x, y, index, defaults = {}) {
    if (!editable) return;
    const adding = index === null;
    const item = adding ? {from: defaults.from || model.states[0]?.id || PSEUDO, to: defaults.to || model.states.find(state => state.id !== defaults.from)?.id || PSEUDO, label: ''} : model.transitions[index];
    const key = adding ? 'state-transition:new' : 'state-transition:' + index;
    const previous = api.menuElement.querySelector('.context-editor');
    if (!api.menuElement.hidden && previous?.dataset.editorKey === key) { focusContextField(previous, 'label'); return; }
    const root = document.createElement('div');
    root.className = 'context-editor state-context';
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
      if (current() !== expectedSource) throw Error('The diagram changed. Reopen this transition to edit its current version.');
      commit(change);
      expectedSource = current();
    }
    if (!adding) root.append(api.contextHeader('Transition', 'Delete transition', () => session, () => { selection = {kind: 'transition', index}; remove(); }));
    else { const heading = document.createElement('div'); heading.className = 'context-heading'; heading.textContent = 'New transition'; root.append(heading); }
    for (const [name, title, value] of [['from', 'From', item.from], ['to', 'To', item.to]]) {
      const label = document.createElement('label');
      label.textContent = title;
      const select = document.createElement('select');
      select.name = name;
      const choices = [[PSEUDO, name === 'from' ? 'Start state' : 'End state'], ...model.states.map(state => [state.id, state.id])];
      for (const [id, text] of choices) { const option = document.createElement('option'); option.value = id; option.textContent = text; select.append(option); }
      select.value = value;
      select.addEventListener('change', () => { if (!adding) session.change(); });
      label.append(select); fields[name] = select; root.append(label);
    }
    const label = document.createElement('label'); label.textContent = 'Transition label';
    const input = document.createElement('input'); input.name = 'label'; input.value = item.label; input.autocomplete = 'off';
    input.addEventListener('input', () => { if (!adding) session.change(); });
    label.append(input); fields.label = input; root.append(label);
    if (adding) {
      const create = document.createElement('button'); create.type = 'button'; create.className = 'state-add-transition'; create.textContent = 'Add transition';
      create.onclick = () => { try { addTransition({from: fields.from.value, to: fields.to.value, label: fields.label.value}); } catch (error) { actionError(error); } };
      root.append(create);
    } else {
      const row = document.createElement('div'); row.className = 'state-actions';
      for (const [title, delta] of [['Move earlier', -1], ['Move later', 1]]) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = title; button.disabled = index + delta < 0 || index + delta >= model.transitions.length;
        button.onclick = () => settle(() => { if (session.dirty) return; try { commit(next => { selection = {kind: 'transition', index: moveStateTransition(next, index, delta)}; }); api.hideMenu(); canvas.focus(); } catch (error) { actionError(error); } });
        row.append(button);
      }
      root.append(row);
      session = api.makeContextSave(root, () => save(next => updateStateTransition(next, index, {from: fields.from.value, to: fields.to.value, label: fields.label.value})));
      session.refresh = () => {};
    }
    api.showContext(root, x, y);
    if (adding) focusContextField(root, 'label'); else focusContextField(root, 'label');
    paint();
  }

  function openState(x, y) {
    if (!editable || selection?.kind !== 'state') return;
    const id = selection.id, state = model.states.find(item => item.id === id), key = 'state:' + id;
    const previous = api.menuElement.querySelector('.context-editor');
    if (!api.menuElement.hidden && previous?.dataset.editorKey === key) { focusContextField(previous, 'id'); return; }
    const root = document.createElement('div'); root.className = 'context-editor state-context'; root.dataset.editorKey = key; bindContextShortcuts(root);
    let session, expectedSource = current();
    const input = document.createElement('input'); input.name = 'id'; input.value = id; input.autocomplete = 'off';
    input.addEventListener('input', () => session.change());
    const label = document.createElement('label'); label.textContent = 'State ID / name'; label.append(input);
    function save() {
      if (current() !== expectedSource) throw Error('The diagram changed. Reopen this state to edit its current version.');
      const nextId = input.value; commit(next => updateState(next, id, nextId)); expectedSource = current();
      selection = {kind: 'state', id: nextId}; root.dataset.editorKey = 'state:' + nextId;
    }
    root.append(api.contextHeader('State', 'Delete state and its transitions', () => session, () => { selection = {kind: 'state', id}; remove(); }));
    root.append(label);
    const row = document.createElement('div'); row.className = 'state-actions';
    const addEdge = document.createElement('button'); addEdge.type = 'button'; addEdge.textContent = '＋ Add transition';
    addEdge.onclick = () => settle(() => { if (session.dirty) return; api.hideMenu(); const r = canvas.getBoundingClientRect(); openTransition(r.left + 40, r.top + 40, null, {from: id}); });
    const addStart = document.createElement('button'); addStart.type = 'button'; addStart.textContent = '＋ Add start';
    addStart.onclick = () => settle(() => { if (session.dirty) return; addTransition({from: PSEUDO, to: id}); });
    const addEnd = document.createElement('button'); addEnd.type = 'button'; addEnd.textContent = '＋ Add end';
    addEnd.onclick = () => settle(() => { if (session.dirty) return; addTransition({from: id, to: PSEUDO}); });
    row.append(addEdge, addStart, addEnd); root.append(row);
    session = api.makeContextSave(root, save); session.refresh = () => {};
    api.showContext(root, x, y); focusContextField(root, 'id'); paint();
  }

  function open(x, y) {
    if (!editable) return;
    if (selection?.kind === 'state') openState(x, y);
    else if (selection?.kind === 'transition') openTransition(x, y, selection.index);
    else api.menu([['＋ Add state · N', () => addNewState()], ['＋ Add transition', () => { if (!model.states.length) api.status('Add a state before adding a transition.'); else openTransition(x, y, null); }]], x, y);
  }

  function openAtSelection() { const rect = canvas.getBoundingClientRect(); open(rect.left + 40, rect.top + 40); }
  function stop(event) { event.preventDefault(); event.stopImmediatePropagation(); }

  for (const type of ['click', 'dblclick', 'contextmenu']) canvas.addEventListener(type, event => {
    if (!active || event.target.closest('.zoom-controls,#edge-reverse')) return;
    stop(event);
    if (!editable) return;
    canvas.focus();
    const item = hit(event.target);
    if (type === 'click') settle(() => { selection = item; paint(); if (!item) api.hideMenu(); });
    else settle(() => { selection = item; paint(); open(event.clientX, event.clientY); });
  }, true);

  canvas.addEventListener('keydown', event => {
    if (!active || event.ctrlKey || event.metaKey || event.key === 'Tab' || event.key === 'F1') return;
    const item = event.target.closest?.('[data-state-node],[data-state-transition]');
    if (item && event.key === ' ') { stop(event); selection = hit(item); paint(); return; }
    if (item && event.key === 'Enter') { stop(event); selection = hit(item); paint(); settle(openAtSelection); return; }
    if (event.target !== canvas && !item) return;
    const key = event.key.toLowerCase();
    if (event.key === 'Escape') { stop(event); selection = null; api.hideMenu(); paint(); return; }
    if (!editable) return;
    if (key === 'n') { stop(event); settle(addNewState); return; }
    if (key === 'c' && selection?.kind === 'state') { stop(event); settle(() => { const id = selection.id; let to = model.states.find(state => state.id !== id)?.id; if (!to) { let targetId; commit(next => { targetId = addState(next); selection = {kind: 'transition', index: addStateTransition(next, {from: id, to: targetId})}; }); return; } addTransition({from: id, to}); }); return; }
    if (key === 'e' || key === 'q' || event.key === 'Enter' && selection) { stop(event); settle(openAtSelection); return; }
    if (event.key === 'Delete' || event.key === 'Backspace' || key === 'x') { stop(event); settle(remove); return; }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      stop(event);
      if (selection?.kind === 'transition') selection = {kind: 'transition', index: Math.max(0, Math.min(model.transitions.length - 1, selection.index + (event.key === 'ArrowUp' ? -1 : 1)))};
      else if (model.states.length) { const i = model.states.findIndex(state => state.id === selection?.id); selection = {kind: 'state', id: model.states[Math.max(0, Math.min(model.states.length - 1, (i < 0 ? 0 : i) + (event.key === 'ArrowUp' ? -1 : 1)))].id}; }
      paint();
    }
  }, true);

  function hints({focus, control, space}) {
    if (!active || !['canvas', 'context'].includes(focus)) return null;
    if (focus === 'context') return {mode: selection?.kind === 'transition' ? 'Edit transition' : 'Edit state', keys: [['E', 'Name / label'], ['Tab', 'Next field'], ['Esc', 'Close']]};
    if (control) return {mode: 'History', keys: [['Z', 'Undo'], ['Y', 'Redo']]};
    if (space) return {mode: 'Space · Pan', keys: [['W A S D', 'Pan canvas']]};
    return {mode: selection?.kind === 'transition' ? 'Transition' : selection ? 'State' : 'State diagram', keys: [['N', 'New state'], ['Q', 'Open menu'], ...(selection?.kind === 'state' ? [['C', 'Add transition'], ['E', 'Edit state'], ['X / Del', 'Delete state']] : selection ? [['E', 'Edit transition'], ['↑ / ↓', 'Choose transition'], ['X / Del', 'Delete transition']] : []), ['F1', 'Shortcuts']]};
  }

  return {
    prepare, attach, invalidate, hints,
    get active() { return active; },
    get editable() { return editable; },
    get error() { return model?.error; },
    cancel() { actionRevision++; selection = null; paint(); }
  };
}
