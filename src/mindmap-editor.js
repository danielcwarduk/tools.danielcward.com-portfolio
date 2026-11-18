import {addMindmapNode, mindmapNodes, parseMindmap, removeMindmapNode, serializeMindmap, updateMindmapNode} from './mindmap-model.js';
import {bindContextShortcuts, focusContextField} from './context-focus.js';

function parentKey(root, key, parent = null) {
  if (root.key === key) return parent?.key ?? null;
  for (const child of root.children) { const result = parentKey(child, key, root); if (result !== undefined) return result; }
}
function descendants(node, output = new Set()) { output.add(node.key); for (const child of node.children) descendants(child, output); return output; }

export function createMindmapEditor(api) {
  const {canvas, scene} = api;
  let active = false, editable = false, model = null, selection = null, actionRevision = 0;
  const current = () => api.source();

  function prepare(text, isMindmap) {
    active = isMindmap;
    editable = false;
    model = isMindmap ? parseMindmap(text) : null;
    if (!active) selection = null;
    return model;
  }
  function invalidate() { editable = false; actionRevision++; }
  function commit(change) {
    if (!editable) throw Error('Wait for the current mind map preview before editing.');
    const next = structuredClone(model);
    change(next);
    const text = serializeMindmap(next);
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
  function itemByKey(key) { return mindmapNodes(model).find(item => item.key === key); }
  function paint() {
    for (const element of scene.querySelectorAll('[data-mindmap-node]')) {
      const selected = selection === element.dataset.mindmapNode;
      element.classList.toggle('mindmap-selected', selected);
      element.setAttribute('aria-pressed', String(selected));
    }
    const selected = itemByKey(selection);
    const status = canvas.querySelector('#selection');
    if (status) status.textContent = selected ? `Mind map branch: ${selected.label}` : 'No mind map branch selected';
    api.updateHints();
  }
  function attach() {
    if (!active) return;
    editable = !model.error;
    if (!editable) { selection = null; paint(); return; }
    const nodes = mindmapNodes(model);
    if (!nodes.some(node => node.key === selection)) selection = null;
    const groups = [...scene.querySelectorAll('g.node.mindmap-node')];
    if (groups.length !== nodes.length) {
      editable = false;
      model.error = 'Mind map branches could not be matched to the source. Edit source directly.';
      paint(); return;
    }
    for (const [index, group] of groups.entries()) {
      const expected = nodes[index];
      const actual = group.querySelector('.nodeLabel')?.textContent?.replace(/\s+/g, ' ').trim();
      if (!actual || actual !== expected.label) {
        editable = false;
        model.error = 'Mind map branch order or labels could not be matched. Edit source directly.';
        paint(); return;
      }
      group.dataset.mindmapNode = expected.key;
      group.setAttribute('role', 'button');
      group.setAttribute('tabindex', '0');
      group.setAttribute('aria-label', `Edit branch ${expected.label}`);
    }
    paint();
  }
  function hit(element) { return element?.closest?.('[data-mindmap-node]')?.dataset.mindmapNode ?? null; }
  function add(parent = selection || model.root.key) {
    try { commit(next => { addMindmapNode(next, parent); selection = parent; }); api.hideMenu(); api.fit(); paint(); }
    catch (error) { api.status(error.message); }
  }
  function remove() {
    if (!selection || selection === model.root.key) return;
    try { commit(next => removeMindmapNode(next, selection)); selection = null; api.hideMenu(); paint(); }
    catch (error) { api.status(error.message); }
  }
  function open(x, y) {
    if (!editable) return;
    if (!selection) { api.menu([['＋ Add branch · N', () => add(model.root.key)]], x, y); return; }
    const node = itemByKey(selection), key = 'mindmap-node:' + selection;
    const previous = api.menuElement.querySelector('.context-editor');
    if (!api.menuElement.hidden && previous?.dataset.editorKey === key) { focusContextField(previous, 'label'); return; }
    const root = document.createElement('div');
    root.className = 'context-editor mindmap-context'; root.dataset.editorKey = key;
    bindContextShortcuts(root);
    let expectedSource = current(), session;
    const descendantsOfNode = descendants(model.root.children.find(child => child.key === selection) || findNode(model.root, selection));
    function actionError(error) { root.querySelector('.error').textContent = error.message; root.querySelector('.autosave-feedback').hidden = false; }
    function save() {
      if (current() !== expectedSource) throw Error('The mind map changed. Reopen this branch to edit its current version.');
      const selectedKey = selection;
      const patch = {label: fields.label.value};
      const reparent = fields.parent && fields.parent.value !== parentKey(model.root, selectedKey);
      if (fields.parent) patch.parent = fields.parent.value;
      commit(next => updateMindmapNode(next, selectedKey, patch));
      if (reparent) selection = null;
      expectedSource = current();
    }
    root.append(api.contextHeader('Mind map branch', 'Delete branch and descendants', () => session, () => { remove(); }));
    if (selection === model.root.key) root.querySelector('.delete-icon').disabled = true;
    const fields = {};
    const label = document.createElement('label'); label.textContent = 'Label';
    const input = document.createElement('input'); input.name = 'label'; input.value = node.label; input.autocomplete = 'off';
    input.addEventListener('input', () => session.change()); label.append(input); fields.label = input; root.append(label);
    if (selection !== model.root.key) {
      const parentLabel = document.createElement('label'); parentLabel.textContent = 'Parent branch';
      const select = document.createElement('select'); select.name = 'parent';
      const currentParent = parentKey(model.root, selection);
      for (const candidate of mindmapNodes(model)) {
        if (descendantsOfNode.has(candidate.key)) continue;
        const option = document.createElement('option'); option.value = candidate.key; option.textContent = candidate.label;
        option.selected = candidate.key === currentParent; select.append(option);
      }
      select.addEventListener('change', () => session.change()); parentLabel.append(select); fields.parent = select; root.append(parentLabel);
    }
    const actions = document.createElement('div'); actions.className = 'mindmap-actions';
    const addButton = document.createElement('button'); addButton.type = 'button'; addButton.textContent = '＋ Add child';
    addButton.onclick = () => settle(() => { if (session.dirty) return; add(selection); }); actions.append(addButton);
    root.append(actions);
    session = api.makeContextSave(root, save); session.refresh = () => {};
    api.showContext(root, x, y); focusContextField(root, 'label'); paint();
    function findNode(node, key) { if (node.key === key) return node; for (const child of node.children) { const found = findNode(child, key); if (found) return found; } return null; }
  }
  function openSelected() { const rect = canvas.getBoundingClientRect(); open(rect.left + 40, rect.top + 40); }
  function stop(event) { event.preventDefault(); event.stopImmediatePropagation(); }

  for (const type of ['click', 'dblclick', 'contextmenu']) canvas.addEventListener(type, event => {
    if (!active || event.target.closest('.zoom-controls,#edge-reverse')) return;
    stop(event);
    if (!editable) return;
    canvas.focus(); const key = hit(event.target);
    if (type === 'click') settle(() => { selection = key; paint(); if (!key) api.hideMenu(); });
    else settle(() => { selection = key; paint(); open(event.clientX, event.clientY); });
  }, true);
  canvas.addEventListener('keydown', event => {
    if (!active || event.ctrlKey || event.metaKey || event.key === 'Tab' || event.key === 'F1') return;
    const element = event.target.closest?.('[data-mindmap-node]');
    if (element && event.key === ' ') { stop(event); selection = hit(element); paint(); return; }
    if (element && event.key === 'Enter') { stop(event); selection = hit(element); paint(); settle(openSelected); return; }
    if (event.target !== canvas && !element) return;
    const key = event.key.toLowerCase();
    if (event.key === 'Escape') { stop(event); selection = null; api.hideMenu(); paint(); return; }
    if (!editable) return;
    if (key === 'n') { stop(event); settle(() => add(selection || model.root.key)); return; }
    if (key === 'e' || key === 'q' || event.key === 'Enter' && selection) { stop(event); settle(openSelected); return; }
    if (event.key === 'Delete' || event.key === 'Backspace' || key === 'x') { stop(event); settle(remove); return; }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      stop(event);
      const nodes = mindmapNodes(model), index = nodes.findIndex(node => node.key === selection);
      selection = nodes[Math.max(0, Math.min(nodes.length - 1, (index < 0 ? 0 : index) + (event.key === 'ArrowUp' ? -1 : 1)))].key;
      paint();
    }
  }, true);

  function hints({focus, control, space}) {
    if (!active || !['canvas', 'context'].includes(focus)) return null;
    if (focus === 'context') return {mode: 'Edit branch', keys: [['E', 'Label'], ['Tab', 'Next field'], ['Esc', 'Close']]};
    if (control) return {mode: 'History', keys: [['Z', 'Undo'], ['Y', 'Redo']]};
    if (space) return {mode: 'Space · Pan', keys: [['W A S D', 'Pan canvas']]};
    return {mode: selection ? 'Mind map branch' : 'Mind map', keys: [['N', 'Add child branch'], ['Q', 'Open branch menu'], ...(selection && selection !== model.root.key ? [['E / Enter', 'Edit / move branch'], ['X / Del', 'Delete branch']] : selection ? [['E / Enter', 'Edit root label']] : []), ['F1', 'Shortcuts']]};
  }
  return {prepare, attach, invalidate, hints, get active() { return active; }, get editable() { return editable; }, get error() { return model?.error; }, cancel() { actionRevision++; selection = null; if (active && model?.root) paint(); }};
}
