import {addErEntity, addErRelationship, erCardinalityLeft, erCardinalityRight, erRelationshipStyles, moveErRelationship, parseErDiagram, removeErEntity, removeErRelationship, reverseErRelationship, serializeErDiagram, updateErEntity, updateErRelationship} from './er-model.js';
import {bindContextShortcuts, focusContextField} from './context-focus.js';

function norm(value) { return (value || '').replace(/\s+/g, ' ').trim(); }

export function createErEditor(api) {
  const {canvas, scene} = api;
  let active = false, editable = false, model = null, selection = null, actionRevision = 0;
  const current = () => api.source();
  function prepare(text, isEr) { active = isEr; editable = false; model = isEr ? parseErDiagram(text) : null; if (!active) selection = null; return model; }
  function invalidate() { editable = false; actionRevision++; }
  function commit(change) { if (!editable) throw Error('Wait for the current ER diagram preview before editing.'); const next = structuredClone(model); change(next); const text = serializeErDiagram(next); if (text !== current()) api.setSource(text); }
  function settle(action) {
    const revision = ++actionRevision, deadline = performance.now() + 5000;
    const attempt = () => { if (revision !== actionRevision || !active) return; if (performance.now() > deadline) { api.status('Wait for the preview before continuing.'); return; } if (!editable) { if (model?.error) return; setTimeout(attempt, 25); return; } if (!api.flushEdits()) { api.status('Finish the current context edit before continuing.'); return; } if (!editable) { setTimeout(attempt, 25); return; } action(); };
    attempt();
  }
  function paint() {
    for (const element of scene.querySelectorAll('[data-er-entity]')) { const chosen = selection?.kind === 'entity' && selection.id === element.dataset.erEntity; element.classList.toggle('er-entity-selected', chosen); element.setAttribute('aria-pressed', String(chosen)); }
    for (const element of scene.querySelectorAll('[data-er-relationship]')) { const chosen = selection?.kind === 'relationship' && selection.index === Number(element.dataset.erRelationship); element.classList.toggle('er-relationship-selected', chosen); if (element.getAttribute('role') === 'button') element.setAttribute('aria-pressed', String(chosen)); }
    const status = canvas.querySelector('#selection'); if (status) status.textContent = selection?.kind === 'entity' ? `Entity: ${selection.id}` : selection?.kind === 'relationship' ? `Relationship ${selection.index + 1}` : 'No ER element selected';
    api.updateHints();
  }
  function attach() {
    if (!active) return;
    editable = !model.error;
    if (!editable) { selection = null; paint(); return; }
    if (selection?.kind === 'entity' && !model.entities.some(item => item.id === selection.id)) selection = null;
    if (selection?.kind === 'relationship' && !model.relationships[selection.index]) selection = null;
    const svg = scene.querySelector('svg'), svgId = svg?.id, nodes = [...scene.querySelectorAll('g.node')];
    if (!svgId || nodes.length !== model.entities.length) { editable = false; model.error = 'ER entities could not be matched to the source. Edit source directly.'; paint(); return; }
    const indices = new Map();
    for (const item of model.entities) {
      const group = nodes.find(node => node.id.startsWith(`${svgId}-entity-${item.id}-`));
      if (!group) { editable = false; model.error = `Entity ${item.id} could not be matched to the source. Edit source directly.`; paint(); return; }
      const idLabel = norm(group.querySelector('.label.name .nodeLabel')?.textContent || group.querySelector('.nodeLabel')?.textContent);
      const types = [...group.querySelectorAll('.label.attribute-type .nodeLabel')].map(node => norm(node.textContent));
      const names = [...group.querySelectorAll('.label.attribute-name .nodeLabel')].map(node => norm(node.textContent));
      const keys = [...group.querySelectorAll('.label.attribute-keys .nodeLabel')].map(node => norm(node.textContent));
      if (idLabel !== item.id || types.length !== item.fields.length || names.length !== item.fields.length || keys.length !== item.fields.length || item.fields.some((field, i) => types[i] !== field.type || names[i] !== field.name || keys[i] !== field.key)) {
        editable = false; model.error = `Fields for ${item.id} could not be matched to the source. Edit source directly.`; paint(); return;
      }
      const suffix = group.id.match(/-(\d+)$/); if (!suffix) { editable = false; model.error = 'ER entity IDs could not be safely matched. Edit source directly.'; paint(); return; }
      indices.set(item.id, suffix[1]); group.dataset.erEntity = item.id; group.setAttribute('role', 'button'); group.setAttribute('tabindex', '0'); group.setAttribute('aria-label', `Edit entity ${item.id}`);
    }
    const edges = [...scene.querySelectorAll('path.relationshipLine')];
    if (edges.length !== model.relationships.length) { editable = false; model.error = 'ER relationship rows could not be matched to the source. Edit source directly.'; paint(); return; }
    const labels = [...scene.querySelectorAll('g.edgeLabel')];
    if (labels.length !== model.relationships.length) { editable = false; model.error = 'ER relationship labels could not be matched to the source. Edit source directly.'; paint(); return; }
    for (const [index, relation] of model.relationships.entries()) {
      const expected = `${svgId}-id_entity-${relation.from}-${indices.get(relation.from)}_entity-${relation.to}-${indices.get(relation.to)}_`;
      const labelId = labels[index].querySelector('g.label')?.dataset.id, expectedLabel = edges[index].id.slice(svgId.length + 1);
      if (!edges[index].id.startsWith(expected) || labelId !== expectedLabel || norm(labels[index].textContent) !== relation.label) { editable = false; model.error = 'ER relationship order, endpoints, or labels could not be matched. Edit source directly.'; paint(); return; }
      const edge = edges[index]; edge.dataset.erRelationship = String(index); edge.setAttribute('role','button'); edge.setAttribute('tabindex','0'); edge.setAttribute('aria-label',`Edit relationship ${relation.from} to ${relation.to}${relation.label ? ': ' + relation.label : ''}`);
      const hit = edge.cloneNode(false); hit.removeAttribute('id'); hit.setAttribute('class','er-relationship-hit'); hit.dataset.erRelationship = String(index); hit.setAttribute('role','button'); hit.setAttribute('tabindex','0'); hit.setAttribute('aria-label',edge.getAttribute('aria-label')); edge.after(hit);
      labels[index].dataset.erRelationship = String(index); labels[index].setAttribute('role','button'); labels[index].setAttribute('tabindex','0'); labels[index].setAttribute('aria-label',edge.getAttribute('aria-label'));
    }
    paint();
  }
  function add() { try { commit(next => { selection = {kind:'entity',id:addErEntity(next)}; }); api.hideMenu(); api.fit(); paint(); } catch (error) { api.status(error.message); } }
  function remove() { if (!selection) return; const selected = selection; try { const latest = parseErDiagram(current()); if (latest.error) throw Error(latest.error); model = latest; editable = true;
      if (selected.kind === 'relationship') { if (!model.relationships[selected.index]) throw Error('This relationship no longer exists.'); commit(value => removeErRelationship(value, selected.index)); selection = null; }
      else { const id = selected.id, index = model.entities.findIndex(item => item.id === id); if (index < 0) throw Error(`Selected entity ${id} is no longer in the source.`); const next = model.entities.filter(item => item.id !== id)[Math.min(index, model.entities.length - 2)]?.id; commit(value => removeErEntity(value, id)); selection = next ? {kind:'entity',id:next} : null; }
      api.hideMenu(); paint(); } catch (error) { api.status(error.message); } }
  function openEntity(x, y) {
    if (!editable || selection?.kind !== 'entity') return;
    const entity = model.entities.find(item => item.id === selection.id); if (!entity) return;
    const key = 'er-entity:' + entity.id, previous = api.menuElement.querySelector('.context-editor');
    if (!api.menuElement.hidden && previous?.dataset.editorKey === key) { focusContextField(previous, 'id'); return; }
    const root = document.createElement('div'); root.className = 'context-editor er-context'; root.dataset.editorKey = key; bindContextShortcuts(root);
    let expectedSource = current(), session, currentId = entity.id;
    const idLabel = document.createElement('label'); idLabel.textContent = 'Entity ID'; const idInput = document.createElement('input'); idInput.name = 'id'; idInput.value = entity.id; idInput.autocomplete = 'off'; idLabel.append(idInput); root.append(api.contextHeader('ER entity', 'Delete entity', () => session, () => { selection = {kind:'entity',id:idInput.value.trim()}; remove(); }), idLabel);
    const fieldsRoot = document.createElement('div'); fieldsRoot.className = 'er-fields'; const fields = [];
    function drawFields(values) {
      fieldsRoot.replaceChildren(); fields.length = 0;
      values.forEach((field, index) => {
        const row = document.createElement('div'); row.className = 'er-field-row';
        const type = document.createElement('input'); type.name = 'type'; type.value = field.type; type.setAttribute('aria-label', `Field ${index + 1} type`);
        const name = document.createElement('input'); name.name = 'name'; name.value = field.name; name.setAttribute('aria-label', `Field ${index + 1} name`);
        const key = document.createElement('select'); key.name = 'key'; key.setAttribute('aria-label', `Field ${index + 1} key`);
        for (const optionText of ['', 'PK', 'FK', 'UK']) { const option = document.createElement('option'); option.value = optionText; option.textContent = optionText || 'No key'; key.append(option); } key.value = field.key || '';
        const actions = document.createElement('span'); actions.className = 'er-field-actions';
        for (const [label, delta] of [['↑', -1], ['↓', 1]]) { const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.title = delta < 0 ? 'Move field earlier' : 'Move field later'; button.setAttribute('aria-label', button.title); button.disabled = index + delta < 0 || index + delta >= values.length; button.onclick = () => { const currentFields = readFields(); [currentFields[index], currentFields[index + delta]] = [currentFields[index + delta], currentFields[index]]; drawFields(currentFields); session.change(); }; actions.append(button); }
        const del = document.createElement('button'); del.type = 'button'; del.textContent = '×'; del.title = 'Delete field'; del.setAttribute('aria-label', 'Delete field'); del.onclick = () => { const next = readFields(); next.splice(index, 1); drawFields(next); session.change(); }; actions.append(del);
        for (const input of [type, name, key]) input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', () => session.change());
        row.append(type, name, key, actions); fieldsRoot.append(row); fields.push({type, name, key});
      });
    }
    function readFields() { return fields.map(row => ({type: row.type.value.trim(), name: row.name.value.trim(), key: row.key.value})); }
    drawFields(entity.fields);
    const addField = document.createElement('button'); addField.type = 'button'; addField.className = 'er-add-field'; addField.textContent = '＋ Add field'; addField.onclick = () => { const rows = readFields(); let n = 1; while (rows.some(field => field.name === `field${n}`)) n++; rows.push({type:'string', name:`field${n}`, key:''}); drawFields(rows); session.change(); focusContextField(root, 'name'); };
    const label = document.createElement('div'); label.className = 'er-field-heading'; label.textContent = 'Fields'; root.append(label, fieldsRoot, addField);
    function save() {
      if (current() !== expectedSource) throw Error('The ER diagram changed. Reopen this entity to edit its current version.');
      const id = idInput.value.trim(), nextFields = readFields();
      commit(next => updateErEntity(next, currentId, {id, fields: nextFields}));
      if (id !== currentId) { selection = {kind:'entity',id}; currentId = id; root.dataset.editorKey = 'er-entity:' + id; }
      expectedSource = current();
    }
    idInput.addEventListener('input', () => session.change());
    if (model.entities.length <= 1) root.querySelector('.delete-icon').disabled = true;
    session = api.makeContextSave(root, save); session.refresh = () => {};
    api.showContext(root, x, y); focusContextField(root, 'id'); paint();
  }
  function openRelationship(x, y, index, defaults = {}) {
    if (!editable) return;
    const adding = index === null, ids = model.entities.map(item => item.id);
    if (ids.length < 2) { api.status('Add a second entity before creating a relationship.'); return; }
    const original = adding ? {from:defaults.from || ids[0],to:ids.find(id=>id!==defaults.from)||ids[1],leftCardinality:'||',style:'--',rightCardinality:'o{',label:''} : model.relationships[index];
    if (!original) return;
    const key = adding ? 'er-relationship:new' : `er-relationship:${index}`, previous = api.menuElement.querySelector('.context-editor');
    if (!api.menuElement.hidden && previous?.dataset.editorKey === key) { focusContextField(previous,'from'); return; }
    const root = document.createElement('div'); root.className='context-editor er-context er-relationship-context'; root.dataset.editorKey=key; bindContextShortcuts(root);
    let expectedSource=current(), session; const fields={};
    if (adding) { const heading=document.createElement('div'); heading.className='context-heading'; heading.textContent='New relationship'; root.append(heading); }
    else root.append(api.contextHeader('ER relationship','Delete relationship',()=>session,()=>{selection={kind:'relationship',index};remove();}));
    function selectField(name,title,values,value) {
      const label=document.createElement('label'); label.textContent=title; const select=document.createElement('select'); select.name=name;
      for (const optionValue of values) { const option=document.createElement('option'); option.value=optionValue; option.textContent=optionValue; select.append(option); }
      select.value=value; select.addEventListener('change',()=>{if(!adding)session.change();}); fields[name]=select; label.append(select); root.append(label); return select;
    }
    selectField('from','From entity',ids,original.from); selectField('to','To entity',ids,original.to);
    selectField('leftCardinality','From cardinality',erCardinalityLeft,original.leftCardinality);
    selectField('style','Relationship style',erRelationshipStyles,original.style);
    fields.style.options[0].textContent='-- · Identifying'; fields.style.options[1].textContent='.. · Non-identifying';
    selectField('rightCardinality','To cardinality',erCardinalityRight,original.rightCardinality);
    const label=document.createElement('label'); label.textContent='Label'; const labelInput=document.createElement('input'); labelInput.name='label'; labelInput.value=original.label; labelInput.autocomplete='off'; labelInput.addEventListener('input',()=>{if(!adding)session.change();}); fields.label=labelInput; label.append(labelInput); root.append(label);
    const reverse=document.createElement('button'); reverse.type='button'; reverse.className='er-reverse-relationship'; reverse.textContent='⇄ Reverse direction'; reverse.onclick=()=>{
      const mapLeft={'o|':'|o','||':'||','o{':'}o','|{':'}|'}, mapRight={'|o':'o|','||':'||','}o':'o{','}|':'|{'};
      const from=fields.from.value, left=fields.leftCardinality.value;
      fields.from.value=fields.to.value; fields.to.value=from;
      fields.leftCardinality.value=mapLeft[fields.rightCardinality.value]; fields.rightCardinality.value=mapRight[left];
      if(!adding)session.change();
    }; root.append(reverse);
    function values() { return {from:fields.from.value,to:fields.to.value,leftCardinality:fields.leftCardinality.value,style:fields.style.value,rightCardinality:fields.rightCardinality.value,label:fields.label.value}; }
    function save() { if(current()!==expectedSource)throw Error('The ER diagram changed. Reopen this relationship to edit its current version.'); commit(next=>updateErRelationship(next,index,values())); expectedSource=current(); }
    if (adding) {
      const create=document.createElement('button'); create.type='button'; create.className='er-add-relationship'; create.textContent='＋ Add relationship';
      create.onclick=()=>{try{commit(next=>{selection={kind:'relationship',index:addErRelationship(next,values())};});api.hideMenu();api.fit();paint();}catch(error){root.querySelector('.error').textContent=error.message;root.querySelector('.autosave-feedback').hidden=false;}}; root.append(create);
    } else {
      const actions=document.createElement('div'); actions.className='er-relationship-actions';
      for(const [title,delta] of [['Move earlier',-1],['Move later',1]]){const button=document.createElement('button');button.type='button';button.textContent=title;button.disabled=index+delta<0||index+delta>=model.relationships.length;button.onclick=()=>settle(()=>{if(session.dirty)return;try{commit(next=>{selection={kind:'relationship',index:moveErRelationship(next,index,delta)};});api.hideMenu();canvas.focus();paint();}catch(error){api.status(error.message);}});actions.append(button);}
      root.append(actions); session=api.makeContextSave(root,save); session.refresh=()=>{};
    }
    api.showContext(root,x,y); focusContextField(root,adding?'from':'label'); paint();
  }
  function hit(target) { const relation = target?.closest?.('[data-er-relationship]'); if (relation) return {kind:'relationship',index:Number(relation.dataset.erRelationship)}; const entity = target?.closest?.('[data-er-entity]'); return entity ? {kind:'entity',id:entity.dataset.erEntity} : null; }
  function open(x, y) { if (selection?.kind === 'entity') openEntity(x, y); else if (selection?.kind === 'relationship') openRelationship(x,y,selection.index); else api.menu([['＋ Add entity · N', add],['＋ Add relationship · C', () => openRelationship(x,y,null)]], x, y); }
  function openSelected() { const rect = canvas.getBoundingClientRect(); open(rect.left + 40, rect.top + 40); }
  function stop(event) { event.preventDefault(); event.stopImmediatePropagation(); }
  for (const type of ['click', 'dblclick', 'contextmenu']) canvas.addEventListener(type, event => {
    if (!active || event.target.closest('.zoom-controls,#edge-reverse')) return; stop(event); if (!editable) return; canvas.focus(); const item = hit(event.target);
    if (type === 'click') settle(() => { selection = item; paint(); if (!item) api.hideMenu(); });
    else settle(() => { selection = item; paint(); open(event.clientX, event.clientY); });
  }, true);
  canvas.addEventListener('keydown', event => {
    if (!active || event.ctrlKey || event.metaKey || event.key === 'Tab' || event.key === 'F1') return;
    const element = event.target.closest?.('[data-er-entity],[data-er-relationship]');
    if (element && event.key === ' ') { stop(event); selection = hit(element); paint(); return; }
    if (element && event.key === 'Enter') { stop(event); selection = hit(element); paint(); settle(openSelected); return; }
    if (event.target !== canvas && !element) return;
    const key = event.key.toLowerCase();
    if (event.key === 'Escape') { stop(event); selection = null; api.hideMenu(); paint(); return; }
    if (!editable) return;
    if (key === 'n') { stop(event); settle(add); return; }
    if (key === 'c') { stop(event); settle(() => openRelationship(canvas.getBoundingClientRect().left+40,canvas.getBoundingClientRect().top+40,null,selection?.kind==='entity'?{from:selection.id}:{})); return; }
    if (key === 'e' || key === 'q' || event.key === 'Enter' && selection) { stop(event); settle(openSelected); return; }
    if (event.key === 'Delete' || event.key === 'Backspace' || key === 'x') { stop(event); settle(remove); return; }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { stop(event); const delta=event.key==='ArrowUp'?-1:1; if(selection?.kind==='relationship'){const index=Math.max(0,Math.min(model.relationships.length-1,selection.index+delta));selection={kind:'relationship',index};}else{const index=model.entities.findIndex(item=>item.id===selection?.id);selection={kind:'entity',id:model.entities[Math.max(0,Math.min(model.entities.length-1,(index<0?0:index)+delta))].id};} paint(); }
  }, true);
  function hints({focus, control, space}) {
    if (!active || !['canvas', 'context'].includes(focus)) return null;
    if (focus === 'context') return {mode:selection?.kind==='relationship'?'Edit relationship':'Edit entity', keys:[['Tab','Next field'],['Esc','Close']]};
    if (control) return {mode:'History', keys:[['Z','Undo'],['Y','Redo']]};
    if (space) return {mode:'Space · Pan', keys:[['W A S D','Pan canvas']]};
    return {mode:selection?.kind==='relationship'?'ER relationship':selection?'ER entity':'ER diagram', keys:[['N','New entity'],['C','Add relationship'],['Q','Open element menu'], ...(selection ? [['E / Enter','Edit selection'],['↑ / ↓','Choose element'],['X / Del','Delete selection']] : []),['F1','Shortcuts']]};
  }
  return {prepare, attach, invalidate, hints, get active() { return active; }, get editable() { return editable; }, get error() { return model?.error; }, cancel() { actionRevision++; selection = null; if (active && model) paint(); }};
}
