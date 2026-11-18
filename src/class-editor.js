import {addClass, addClassRelationship, classMembers, classRelationshipOperators, moveClassRelationship, parseClassDiagram, removeClass, removeClassRelationship, serializeClassDiagram, updateClass, updateClassRelationship} from './class-model.js';
import {bindContextShortcuts, focusContextField} from './context-focus.js';

function normalize(text) { return (text || '').replace(/\s+/g, ' ').trim(); }
const relationNames = {'<|--':'Inheritance','--|>':'Inheritance (reverse)','*--':'Composition','--*':'Composition (reverse)','o--':'Aggregation','--o':'Aggregation (reverse)','-->':'Association','<--':'Association (reverse)','--':'Solid link','..>':'Dependency','<..':'Dependency (reverse)','..|>':'Realization','<|..':'Realization (reverse)','..':'Dashed link'};

export function createClassEditor(api) {
  const {canvas, scene} = api;
  let active = false, editable = false, model = null, selection = null, actionRevision = 0;
  const current = () => api.source();

  function prepare(text, isClass) {
    active = isClass; editable = false;
    model = isClass ? parseClassDiagram(text) : null;
    if (!active) selection = null;
    return model;
  }
  function invalidate() { editable = false; actionRevision++; }
  function commit(change) {
    if (!editable) throw Error('Wait for the current class diagram preview before editing.');
    const next = structuredClone(model); change(next);
    const text = serializeClassDiagram(next);
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
    for (const element of scene.querySelectorAll('[data-class-node]')) {
      const chosen = selection?.kind === 'class' && selection.id === element.dataset.classNode;
      element.classList.toggle('class-selected', chosen);
      element.setAttribute('aria-pressed', String(chosen));
    }
    for (const element of scene.querySelectorAll('[data-class-relationship]')) {
      const chosen = selection?.kind === 'relationship' && selection.index === Number(element.dataset.classRelationship);
      element.classList.toggle('class-relationship-selected', chosen);
      if (element.getAttribute('role') === 'button') element.setAttribute('aria-pressed', String(chosen));
    }
    const status = canvas.querySelector('#selection');
    if (status) status.textContent = selection?.kind === 'class' ? `Class: ${selection.id}` : selection?.kind === 'relationship' ? `Relationship ${selection.index + 1}` : 'No class or relationship selected';
    api.updateHints();
  }
  function attach() {
    if (!active) return;
    editable = !model.error;
    if (!editable) { selection = null; paint(); return; }
    if (selection?.kind === 'class' && !model.classes.some(item => item.id === selection.id)) selection = null;
    if (selection?.kind === 'relationship' && !model.relationships[selection.index]) selection = null;
    const svgId = scene.querySelector('svg')?.id;
    const groups = [...scene.querySelectorAll('g.node')];
    for (const item of model.classes) {
      const group = groups.find(node => node.id.startsWith(svgId + '-classId-' + item.id + '-'));
      if (!group) { editable = false; model.error = `Class ${item.id} could not be matched to the source. Edit source directly.`; paint(); return; }
      const actualAttributes = [...group.querySelectorAll('g.members-group .nodeLabel')].map(node => normalize(node.textContent));
      const expectedAttributes = item.attributes.map(member => member.text);
      const actualMethods = [...group.querySelectorAll('g.methods-group .nodeLabel')].map(node => normalize(node.textContent));
      const expectedMethods = item.methods.map(member => member.text);
      if (JSON.stringify(actualAttributes) !== JSON.stringify(expectedAttributes) || JSON.stringify(actualMethods) !== JSON.stringify(expectedMethods)) {
        editable = false; model.error = `Members for ${item.id} could not be matched to the source. Edit source directly.`; paint(); return;
      }
      group.dataset.classNode = item.id;
      group.setAttribute('role', 'button'); group.setAttribute('tabindex', '0'); group.setAttribute('aria-label', `Edit class ${item.id}`);
    }
    const edges = [...scene.querySelectorAll('path.relation')];
    const labels = [...scene.querySelectorAll('g.edgeLabel')];
    if (edges.length !== model.relationships.length || labels.length !== model.relationships.length) {
      editable = false; model.error = 'Class relationships could not be matched to the source. Edit source directly.'; paint(); return;
    }
    for (const [index, relation] of model.relationships.entries()) {
      const edge = edges[index], expectedId = `${svgId}-id_${relation.from}_${relation.to}_`;
      if (!edge.id.startsWith(expectedId) || normalize(labels[index].textContent) !== relation.label) {
        editable = false; model.error = 'Class relationship order, endpoints, or labels could not be matched. Edit source directly.'; paint(); return;
      }
      edge.dataset.classRelationship = String(index);
      edge.setAttribute('role', 'button'); edge.setAttribute('tabindex', '0');
      edge.setAttribute('aria-label', `Edit ${relation.operator} relationship from ${relation.from} to ${relation.to}${relation.label ? ': ' + relation.label : ''}`);
      const hit = edge.cloneNode(false);
      hit.removeAttribute('id'); hit.removeAttribute('marker-start'); hit.removeAttribute('marker-end');
      hit.setAttribute('class', 'class-relationship-hit'); hit.dataset.classRelationship = String(index);
      hit.setAttribute('role', 'button'); hit.setAttribute('tabindex', '0'); hit.setAttribute('aria-label', edge.getAttribute('aria-label'));
      edge.after(hit);
      labels[index].dataset.classRelationship = String(index);
      labels[index].setAttribute('role', 'button'); labels[index].setAttribute('tabindex', '0');
      labels[index].setAttribute('aria-label', edge.getAttribute('aria-label'));
    }
    paint();
  }
  function hit(element) {
    const relation = element?.closest?.('[data-class-relationship]');
    if (relation) return {kind: 'relationship', index: Number(relation.dataset.classRelationship)};
    const classNode = element?.closest?.('[data-class-node]');
    return classNode ? {kind: 'class', id: classNode.dataset.classNode} : null;
  }
  function add() {
    try { commit(next => { selection = {kind: 'class', id: addClass(next)}; }); api.hideMenu(); api.fit(); paint(); }
    catch (error) { api.status(error.message); }
  }
  function addRelationship(x, y, defaults = {}) {
    if (model.classes.length < 2) { api.status('Add a second class before creating a relationship.'); return; }
    openRelationship(x, y, null, defaults);
  }
  function remove() {
    if (!selection) return;
    if (selection.kind === 'relationship') {
      const index = selection.index;
      try { commit(next => removeClassRelationship(next, index)); selection = null; api.hideMenu(); paint(); }
      catch (error) { api.status(error.message); }
      return;
    }
    const id = selection.id, index = model.classes.findIndex(item => item.id === id), nextId = model.classes.filter(item => item.id !== id)[Math.min(index, model.classes.length - 2)]?.id;
    try { commit(next => removeClass(next, id)); selection = nextId ? {kind:'class', id: nextId} : null; api.hideMenu(); paint(); }
    catch (error) { api.status(error.message); }
  }
  function openRelationship(x, y, index, defaults = {}) {
    if (!editable) return;
    const adding = index === null;
    const classes = model.classes.map(item => item.id);
    const relation = adding ? {from: defaults.from || classes[0], to: defaults.to || classes.find(id => id !== defaults.from) || classes[1], operator: '-->', label: ''} : model.relationships[index];
    const key = adding ? 'class-relationship:new' : 'class-relationship:' + index;
    const previous = api.menuElement.querySelector('.context-editor');
    if (!api.menuElement.hidden && previous?.dataset.editorKey === key) { focusContextField(previous, 'from'); return; }
    const root = document.createElement('div'); root.className = 'context-editor class-context relationship-context'; root.dataset.editorKey = key; bindContextShortcuts(root);
    let expectedSource = current(), session;
    const fields = {};
    function save() {
      if (current() !== expectedSource) throw Error('The class diagram changed. Reopen this relationship to edit its current version.');
      const patch = {from: fields.from.value, to: fields.to.value, operator: fields.operator.value, label: fields.label.value};
      commit(next => updateClassRelationship(next, index, patch)); expectedSource = current();
    }
    if (adding) { const heading = document.createElement('div'); heading.className = 'context-heading'; heading.textContent = 'New relationship'; root.append(heading); }
    else root.append(api.contextHeader('Class relationship', 'Delete relationship', () => session, () => { selection = {kind: 'relationship', index}; remove(); }));
    for (const [name, title, value] of [['from', 'From class', relation.from], ['to', 'To class', relation.to]]) {
      const label = document.createElement('label'); label.textContent = title;
      const select = document.createElement('select'); select.name = name;
      for (const id of classes) { const option = document.createElement('option'); option.value = id; option.textContent = id; option.selected = id === value; select.append(option); }
      select.addEventListener('change', () => { if (!adding) session.change(); }); fields[name] = select; label.append(select); root.append(label);
    }
    const typeLabel = document.createElement('label'); typeLabel.textContent = 'Relationship type and direction';
    const type = document.createElement('select'); type.name = 'operator';
    for (const operator of classRelationshipOperators) { const option = document.createElement('option'); option.value = operator; option.textContent = `${relationNames[operator]} (${operator})`; option.selected = operator === relation.operator; type.append(option); }
    type.addEventListener('change', () => { if (!adding) session.change(); }); fields.operator = type; typeLabel.append(type); root.append(typeLabel);
    const labelLabel = document.createElement('label'); labelLabel.textContent = 'Label';
    const labelInput = document.createElement('input'); labelInput.name = 'label'; labelInput.value = relation.label; labelInput.autocomplete = 'off';
    labelInput.addEventListener('input', () => { if (!adding) session.change(); }); fields.label = labelInput; labelLabel.append(labelInput); root.append(labelLabel);
    if (adding) {
      const create = document.createElement('button'); create.type = 'button'; create.className = 'class-add-relationship'; create.textContent = 'Add relationship';
      create.onclick = () => { try { commit(next => { selection = {kind:'relationship', index: addClassRelationship(next, {from: fields.from.value, to: fields.to.value, operator: fields.operator.value, label: fields.label.value})}; }); api.hideMenu(); api.fit(); paint(); } catch (error) { root.querySelector('.error').textContent = error.message; root.querySelector('.autosave-feedback').hidden = false; } };
      root.append(create);
    } else {
      const actions = document.createElement('div'); actions.className = 'class-actions';
      for (const [title, delta] of [['Move earlier', -1], ['Move later', 1]]) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = title; button.disabled = index + delta < 0 || index + delta >= model.relationships.length;
        button.onclick = () => settle(() => { if (session.dirty) return; try { commit(next => { selection = {kind: 'relationship', index: moveClassRelationship(next, index, delta)}; }); api.hideMenu(); canvas.focus(); } catch (error) { root.querySelector('.error').textContent = error.message; root.querySelector('.autosave-feedback').hidden = false; } });
        actions.append(button);
      }
      root.append(actions);
      session = api.makeContextSave(root, save); session.refresh = () => {};
    }
    api.showContext(root, x, y); focusContextField(root, adding ? 'from' : 'label'); paint();
  }
  function openClass(x, y) {
    if (!editable || selection?.kind !== 'class') return;
    const item = model.classes.find(candidate => candidate.id === selection.id);
    const key = 'class-node:' + selection.id;
    const previous = api.menuElement.querySelector('.context-editor');
    if (!api.menuElement.hidden && previous?.dataset.editorKey === key) { focusContextField(previous, 'id'); return; }
    const root = document.createElement('div'); root.className = 'context-editor class-context'; root.dataset.editorKey = key; bindContextShortcuts(root);
    let expectedSource = current(), session;
    const fields = {};
    function save() {
      if (current() !== expectedSource) throw Error('The class diagram changed. Reopen this class to edit its current version.');
      const id = fields.id.value.trim();
      commit(next => updateClass(next, item.id, {id, attributes: fields.attributes.value.split(/\r?\n/).map(value => value.trim()).filter(Boolean), methods: fields.methods.value.split(/\r?\n/).map(value => value.trim()).filter(Boolean)}));
      if (id !== item.id) { selection = {kind: 'class', id}; root.dataset.editorKey = 'class-node:' + id; }
      expectedSource = current();
    }
    root.append(api.contextHeader('Class', 'Delete class', () => session, () => { selection = {kind: 'class', id: item.id}; remove(); }));
    if (model.classes.length <= 1) root.querySelector('.delete-icon').disabled = true;
    const idLabel = document.createElement('label'); idLabel.textContent = 'Class name';
    const idInput = document.createElement('input'); idInput.name = 'id'; idInput.value = item.id; idInput.autocomplete = 'off'; idInput.addEventListener('input', () => session.change());
    fields.id = idInput; idLabel.append(idInput); root.append(idLabel);
    for (const [name, title, values] of [['attributes', 'Attributes', classMembers(item).attributes], ['methods', 'Methods', classMembers(item).methods]]) {
      const label = document.createElement('label'); label.textContent = title;
      const textarea = document.createElement('textarea'); textarea.name = name; textarea.rows = Math.max(2, Math.min(5, values.length + 1)); textarea.value = values.join('\n');
      textarea.addEventListener('input', () => session.change()); label.append(textarea); fields[name] = textarea; root.append(label);
    }
    const actions = document.createElement('div'); actions.className = 'class-actions';
    const attribute = document.createElement('button'); attribute.type = 'button'; attribute.textContent = '＋ Add attribute';
    attribute.onclick = () => { fields.attributes.value += (fields.attributes.value ? '\n' : '') + '+String field'; session.change(); focusContextField(root, 'attributes'); };
    const method = document.createElement('button'); method.type = 'button'; method.textContent = '＋ Add method';
    method.onclick = () => { fields.methods.value += (fields.methods.value ? '\n' : '') + '+method()'; session.change(); focusContextField(root, 'methods'); };
    actions.append(attribute, method); root.append(actions);
    const relationship = document.createElement('button'); relationship.type = 'button'; relationship.className = 'class-add-relationship'; relationship.textContent = '＋ Add relationship';
    relationship.disabled = model.classes.length < 2; relationship.onclick = () => settle(() => { if (session.dirty) return; api.hideMenu(); openRelationship(x, y, null, {from: item.id}); }); root.append(relationship);
    session = api.makeContextSave(root, save); session.refresh = () => {};
    api.showContext(root, x, y); focusContextField(root, 'id'); paint();
  }
  function open(x, y) {
    if (!editable) return;
    if (selection?.kind === 'class') { openClass(x, y); return; }
    if (selection?.kind === 'relationship') { openRelationship(x, y, selection.index); return; }
    api.menu([['＋ Add class · N', () => add()], ['＋ Add relationship · C', () => addRelationship(x, y)]], x, y);
  }
  function openSelected() { const rect = canvas.getBoundingClientRect(); open(rect.left + 40, rect.top + 40); }
  function stop(event) { event.preventDefault(); event.stopImmediatePropagation(); }

  for (const type of ['click', 'dblclick', 'contextmenu']) canvas.addEventListener(type, event => {
    if (!active || event.target.closest('.zoom-controls,#edge-reverse')) return;
    stop(event);
    if (!editable) return;
    canvas.focus(); const item = hit(event.target);
    if (type === 'click') settle(() => { selection = item; paint(); if (!item) api.hideMenu(); });
    else settle(() => { selection = item; paint(); open(event.clientX, event.clientY); });
  }, true);
  canvas.addEventListener('keydown', event => {
    if (!active || event.ctrlKey || event.metaKey || event.key === 'Tab' || event.key === 'F1') return;
    const element = event.target.closest?.('[data-class-node],[data-class-relationship]');
    if (element && event.key === ' ') { stop(event); selection = hit(element); paint(); return; }
    if (element && event.key === 'Enter') { stop(event); selection = hit(element); paint(); settle(openSelected); return; }
    if (event.target !== canvas && !element) return;
    const key = event.key.toLowerCase();
    if (event.key === 'Escape') { stop(event); selection = null; api.hideMenu(); paint(); return; }
    if (!editable) return;
    if (key === 'n') { stop(event); settle(add); return; }
    if (key === 'c') { stop(event); settle(() => addRelationship(canvas.getBoundingClientRect().left + 40, canvas.getBoundingClientRect().top + 40, selection?.kind === 'class' ? {from: selection.id} : {})); return; }
    if (key === 'e' || key === 'q' || event.key === 'Enter' && selection) { stop(event); settle(openSelected); return; }
    if (event.key === 'Delete' || event.key === 'Backspace' || key === 'x') { stop(event); settle(remove); return; }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      stop(event);
      if (selection?.kind === 'relationship') selection = {kind: 'relationship', index: Math.max(0, Math.min(model.relationships.length - 1, selection.index + (event.key === 'ArrowUp' ? -1 : 1)))};
      else { const index = model.classes.findIndex(item => item.id === selection?.id); selection = {kind:'class', id: model.classes[Math.max(0, Math.min(model.classes.length - 1, (index < 0 ? 0 : index) + (event.key === 'ArrowUp' ? -1 : 1)))].id}; }
      paint();
    }
  }, true);
  function hints({focus, control, space}) {
    if (!active || !['canvas', 'context'].includes(focus)) return null;
    if (focus === 'context') return {mode: selection?.kind === 'relationship' ? 'Edit relationship' : 'Edit class', keys: [['E', 'Fields'], ['Tab', 'Next field'], ['Esc', 'Close']]};
    if (control) return {mode: 'History', keys: [['Z', 'Undo'], ['Y', 'Redo']]};
    if (space) return {mode: 'Space · Pan', keys: [['W A S D', 'Pan canvas']]};
    return {mode: selection?.kind === 'relationship' ? 'Relationship' : selection ? 'Class' : 'Class diagram', keys: [['N', 'New class'], ['C', 'Add relationship'], ['Q', 'Open menu'], ...(selection ? [['E / Enter', 'Edit selection'], ['X / Del', 'Delete selection']] : []), ['F1', 'Shortcuts']]};
  }
  return {prepare, attach, invalidate, hints, get active() { return active; }, get editable() { return editable; }, get error() { return model?.error; }, cancel() { actionRevision++; selection = null; if (active && model) paint(); }};
}
