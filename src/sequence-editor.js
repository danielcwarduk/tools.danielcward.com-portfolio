import {labelInputValue,labelFromInput} from './label-input';
import {parseSequence,serializeSequence,sequenceMessages,messageStyles,addParticipant,updateParticipant,removeParticipant,updateMessage,removeMessage,moveMessage} from './sequence-model';
import {bindContextShortcuts,focusContextField} from './context-focus';

export function createSequenceEditor(api){
 const {canvas,scene}=api;
 let active=false,editable=false,model=null,selection=null,connecting=null,target=null,dragFrom=null,ignoreClick=false,actionRevision=0;
 const current=()=>api.source(),renamedParticipants=new Map();
 function resolveItem(item){if(item?.kind!=='participant')return item;let id=item.id;const visited=new Set();while(!model.participants.some(p=>p.id===id)&&renamedParticipants.has(id)&&!visited.has(id)){visited.add(id);id=renamedParticipants.get(id);}return model.participants.some(p=>p.id===id)?{kind:'participant',id}:null;}
 function settle(action){const revision=++actionRevision,deadline=performance.now()+5000;const attempt=()=>{if(revision!==actionRevision||!active)return;if(performance.now()>deadline){api.status('Wait for the preview before continuing.');return;}if(!editable){if(model?.error)return;setTimeout(attempt,25);return;}if(!api.flushEdits()){api.status('Finish the current context edit before continuing.');return;}if(!editable){setTimeout(attempt,25);return;}action();};attempt();}
 function invalidate(cancelActions=false){if(cancelActions){actionRevision++;renamedParticipants.clear();}editable=false;connecting=null;target=null;dragFrom=null;}
 function prepare(text,isSequence){active=isSequence;editable=false;model=isSequence?parseSequence(text):null;if(!active){selection=null;connecting=null;target=null;}return model;}
 function commit(change){
  if(!editable)throw Error('Wait for the current sequence preview before editing.');
  const next=structuredClone(model);change(next);const text=serializeSequence(next);
  if(text!==current())api.setSource(text);
 }
 function attach(){
  if(!active)return;editable=!model.error;
  if(selection?.kind==='participant'&&!model.participants.some(p=>p.id===selection.id))selection=null;
  if(selection?.kind==='message'&&!sequenceMessages(model)[selection.index])selection=null;
  if(!editable){selection=null;paint();return;}
  for(const el of scene.querySelectorAll('[data-et="participant"],[data-et="life-line"]')){
   const id=el.getAttribute('data-id');if(model.participants.some(p=>p.id===id))el.dataset.seqParticipant=id;
  }
  // Legacy actor headers also use rect[name] rather than participant metadata.
  for(const el of scene.querySelectorAll('g.actor-man[name]')){if(model.participants.some(p=>p.id===el.getAttribute('name')))el.dataset.seqParticipant=el.getAttribute('name');}
  for(const el of scene.querySelectorAll('rect.actor')){const id=el.getAttribute('name');if(model.participants.some(p=>p.id===id))(el.closest('g')||el).dataset.seqParticipant=id;}
  const lines=[...scene.querySelectorAll('.messageLine0,.messageLine1')];
  for(const [index,line]of lines.entries()){
   line.dataset.seqMessage=index;for(let sibling=line.previousElementSibling;sibling&&!sibling.matches('.messageLine0,.messageLine1');sibling=sibling.previousElementSibling){if(sibling.matches('.messageText'))sibling.dataset.seqMessage=index;}
   const hit=line.cloneNode(false);hit.removeAttribute('id');hit.removeAttribute('style');hit.removeAttribute('marker-end');hit.removeAttribute('marker-start');hit.setAttribute('class','connection-hit sequence-hit');hit.dataset.seqMessage=index;line.before(hit);
  }
  paint();
 }
 function paint(){
  for(const el of scene.querySelectorAll('[data-seq-participant]')){el.classList.toggle('sequence-selected',selection?.kind==='participant'&&selection.id===el.dataset.seqParticipant);el.classList.toggle('sequence-source',connecting===el.dataset.seqParticipant);}
  for(const el of scene.querySelectorAll('[data-seq-message]'))if(!el.classList.contains('connection-hit'))el.classList.toggle('sequence-selected',selection?.kind==='message'&&selection.index===Number(el.dataset.seqMessage));
  const label=canvas.querySelector('#selection');if(label)label.textContent=connecting?`Message from ${connecting}${target?' to '+target+' · Enter to connect':' · choose a participant'}`:selection?.kind==='participant'?'Participant: '+selection.id:selection?'Message '+(selection.index+1):'No sequence item selected';
  api.updateHints();
 }
 function hit(el){if(!el)return null;const message=el.closest?.('[data-seq-message]');if(message)return {kind:'message',index:Number(message.dataset.seqMessage)};const actor=el.closest?.('[data-seq-participant]');return actor?{kind:'participant',id:actor.dataset.seqParticipant}:null;}
 function choose(item){if(connecting&&item?.kind==='participant'){connect(item.id);return;}selection=item;paint();}
 function connect(to){const from=connecting;if(!from||!to)return;connecting=null;target=null;commit(m=>{m.events.push({kind:'message',from,to,arrow:'->>',activation:'',label:''});selection={kind:'message',index:sequenceMessages(m).length-1};});paint();}
 function add(type='participant'){try{commit(m=>{selection={kind:'participant',id:addParticipant(m,type)};});api.fit();}catch(e){api.status(e.message);}}
 function startConnect(){if(connecting){connecting=null;target=null;}else if(selection?.kind==='participant'){connecting=selection.id;target=null;}else api.status('Select a participant first.');paint();}
 function remove(){if(!selection)return;try{const item={...selection};commit(m=>{if(item.kind==='participant')removeParticipant(m,item.id);else removeMessage(m,item.index);});selection=null;api.hideMenu();paint();}catch(e){api.status(e.message);}}
 function open(x,y,field='label'){
  if(!editable)return;connecting=null;target=null;dragFrom=null;
  if(!selection){api.menu([['＋ Participant · N',()=>add()],['＋ Actor · Shift+A',()=>add('actor')]],x,y);return;}
  const item={...selection},key=item.kind==='participant'?'sequence-participant:'+item.id:'sequence-message:'+item.index;
  const previous=api.menuElement.querySelector('.context-editor');if(!api.menuElement.hidden&&previous?.dataset.editorKey===key){focusContextField(previous,field);return;}
  const root=document.createElement('div');root.className='context-editor sequence-context';root.dataset.editorKey=key;bindContextShortcuts(root);
  let session,expectedSource=current();const fields={};
  function actionError(error){const feedback=root.querySelector('.autosave-feedback');if(feedback)feedback.hidden=false;root.querySelector('.error').textContent=error.message;}
  function save(change){if(current()!==expectedSource)throw Error('The diagram changed. Reopen this item to edit its current version.');commit(change);expectedSource=current();}
  root.append(api.contextHeader(item.kind==='participant'?'Participant':'Message',item.kind==='participant'?'Delete participant and its messages':'Delete message',()=>session,()=>{selection=item;remove();}));
  function input(name,title,value,options){const label=document.createElement('label');label.textContent=title;const control=document.createElement(options?'select':'input');control.name=name;control.value=name==='edge-label'?labelInputValue(value):value;control.autocomplete='off';if(options){for(const [v,text]of options){const o=document.createElement('option');o.value=v;o.textContent=text;control.append(o);}control.value=value;}control.addEventListener(options?'change':'input',()=>session.change());label.append(control);root.append(label);fields[name]=control;return control;}
  if(item.kind==='participant'){
   const p=model.participants.find(p=>p.id===item.id);const types=input('participant-type','Type',p.type,[['participant','Participant'],['actor','Actor']]);types.dataset.contextField='shape';
   input('id','Variable / ID',p.id);input('label','Label',p.label);
   const row=document.createElement('div');row.className='sequence-actions';for(const [title,delta]of [['Move left',-1],['Move right',1]]){const button=document.createElement('button');button.type='button';button.textContent=title;button.disabled=model.participants.indexOf(p)+delta<0||model.participants.indexOf(p)+delta>=model.participants.length;button.onclick=()=>settle(()=>{if(session.dirty)return;try{commit(m=>{const index=m.participants.findIndex(p=>p.id===item.id),other=index+delta;if(other<0||other>=m.participants.length)return;[m.participants[index],m.participants[other]]=[m.participants[other],m.participants[index]];const declarations=m.participants.map(p=>({kind:'participant',id:p.id}));m.events=m.events.filter(e=>e.kind!=='participant');const header=m.events.findIndex(e=>e.kind==='header');m.events.splice(header+1,0,...declarations);});api.hideMenu();canvas.focus();}catch(e){actionError(e);}});row.append(button);}root.append(row);
   const connectButton=document.createElement('button');connectButton.type='button';connectButton.className='sequence-connect';connectButton.textContent='Draw message · C';connectButton.onclick=()=>settle(()=>{if(session.dirty)return;selection={...item};api.hideMenu();canvas.focus();startConnect();});root.append(connectButton);
   session=api.makeContextSave(root,()=>{save(m=>updateParticipant(m,item.id,{id:fields.id.value,label:fields.label.value,type:types.value}));if(item.id!==fields.id.value)renamedParticipants.set(item.id,fields.id.value);item.id=fields.id.value;selection={...item};root.dataset.editorKey='sequence-participant:'+item.id;});
  }else{
   const e=sequenceMessages(model)[item.index],choices=model.participants.map(p=>[p.id,p.label+' ('+p.id+')']);
   input('from','From',e.from,choices);input('to','To',e.to,choices);
   const type=input('message-style','Arrow style',e.arrow,messageStyles);type.dataset.contextField='shape';
   input('activation','Activation',e.activation||'',[['','No activation change'],['+','Start receiver activation'],['-','End sender activation']]);const activationNote=document.createElement('p');activationNote.className='sequence-note';activationNote.textContent='Start on a call; end on a later reply.';root.append(activationNote);
   input('edge-label','Label',e.label);
   const row=document.createElement('div');row.className='sequence-actions';
   for(const [title,delta]of [['Move earlier',-1],['Move later',1],['Reverse direction',0]]){
    const button=document.createElement('button');button.type='button';button.textContent=title;button.disabled=delta!==0&&(item.index+delta<0||item.index+delta>=sequenceMessages(model).length);
    button.onclick=()=>settle(()=>{if(session.dirty)return;try{commit(m=>{if(delta){item.index=moveMessage(m,item.index,delta);selection={...item};}else{const e=sequenceMessages(m)[item.index];if(e.activation)throw Error('Remove the activation change before reversing this message.');updateMessage(m,item.index,{from:e.to,to:e.from});}});api.hideMenu();canvas.focus();}catch(e){actionError(e);}});row.append(button);
   }root.append(row);
   session=api.makeContextSave(root,()=>save(m=>updateMessage(m,item.index,{from:fields.from.value,to:fields.to.value,arrow:type.value,activation:fields.activation.value,label:labelFromInput(fields['edge-label'].value)})));
  }
  api.showContext(root,x,y);focusContextField(root,field);paint();
 }
 function atSelection(field='label'){const r=canvas.getBoundingClientRect();open(r.left+40,r.top+40,field);}
 function stop(e){e.preventDefault();e.stopImmediatePropagation();}
 for(const type of ['click','dblclick','contextmenu'])canvas.addEventListener(type,e=>{
  if(!active||e.target.closest('.zoom-controls,#edge-reverse'))return;stop(e);if(!editable)return;
  canvas.focus();if(type==='click'&&ignoreClick){ignoreClick=false;return;}const item=hit(e.target);
  if(type==='click'){settle(()=>{choose(resolveItem(item));api.hideMenu();});}
  else{settle(()=>{selection=resolveItem(item);paint();open(e.clientX,e.clientY);});}
 },true);
 canvas.addEventListener('pointerdown',e=>{
  if(!active||e.target.closest('.zoom-controls,#edge-reverse')||e.button===1||e.pointerType==='touch')return;
  e.stopImmediatePropagation();e.preventDefault();canvas.focus();if(editable&&e.button===0&&!connecting){const item=hit(e.target);if(item?.kind==='participant')dragFrom={id:item.id,x:e.clientX,y:e.clientY,started:false};}
 },true);
 window.addEventListener('pointermove',e=>{if(!dragFrom)return;if(!dragFrom.started&&Math.hypot(e.clientX-dragFrom.x,e.clientY-dragFrom.y)<6)return;dragFrom.started=true;connecting=dragFrom.id;const item=hit(document.elementFromPoint(e.clientX,e.clientY));target=item?.kind==='participant'?item.id:null;paint();},true);
 window.addEventListener('pointerup',e=>{if(!dragFrom)return;const started=dragFrom.started,from=dragFrom.id;dragFrom=null;if(!started)return;const item=hit(document.elementFromPoint(e.clientX,e.clientY)||e.target);if(item?.kind==='participant')settle(()=>{connecting=from;connect(item.id);});else{connecting=null;target=null;paint();}ignoreClick=true;setTimeout(()=>ignoreClick=false,0);e.stopImmediatePropagation();e.preventDefault();},true);
 window.addEventListener('pointercancel',()=>{if(dragFrom){dragFrom=null;connecting=null;target=null;paint();}},true);
 canvas.addEventListener('keydown',e=>{
  if(!active||e.target.closest('.zoom-controls'))return;
  if(e.ctrlKey||e.metaKey||e.key==='F1'||e.key==='Tab')return;
  const key=e.key.toLowerCase();if(e.key===' '){stop(e);api.setSpace(true);return;}if(api.spaceHeld()&&['w','a','s','d'].includes(key)){stop(e);const direction={w:[0,45],a:[45,0],s:[0,-45],d:[-45,0]}[key];api.panBy(...direction);return;}
  stop(e);if(e.key==='Escape'){connecting=null;target=null;dragFrom=null;api.hideMenu();paint();return;}if(!editable)return;
  if(e.shiftKey){if(key==='a')settle(()=>add('actor'));else if(key==='p')settle(()=>add());return;}
  if(e.key==='Enter'&&connecting){if(!e.repeat&&target){const destination=target;settle(()=>connect(destination));}return;}
  if(['w','a','s','d'].includes(key)){
   if(selection?.kind==='message'&&!connecting){const messages=sequenceMessages(model),delta=['w','a'].includes(key)?-1:1;selection={kind:'message',index:Math.max(0,Math.min(messages.length-1,selection.index+delta))};}
   else{const index=model.participants.findIndex(p=>p.id===(selection?.kind==='participant'?selection.id:connecting)),delta=['w','a'].includes(key)?-1:1;const next=model.participants[Math.max(0,Math.min(model.participants.length-1,index<0?0:index+delta))];if(next){selection={kind:'participant',id:next.id};if(connecting)target=next.id===connecting?null:next.id;}}paint();return;
  }
  if(['Delete','Backspace'].includes(e.key)||key==='x'){settle(remove);return;}
  if(key==='n')settle(()=>add());else if(key==='c')settle(startConnect);else if(['e','r','q'].includes(key)||e.key==='F2')settle(()=>atSelection(e.key==='F2'?'id':key==='r'?'shape':'label'));else if(e.key==='Enter'&&selection)settle(()=>atSelection());
 },true);
 function hints({focus,control,space,shift}){
  if(!active||!['canvas','context'].includes(focus))return null;
  if(focus==='context')return {mode:selection?.kind==='message'?'Edit message':'Edit participant',keys:[['R','Type / style'],['E','Label'],...(selection?.kind==='participant'?[['F2','ID']]:[]),['Tab','Next field'],['Esc','Close']]};
  if(control)return {mode:'History',keys:[['Z','Undo'],['Y','Redo']]};
  if(!editable)return {mode:'Sequence · source preview',keys:[['Edit source','Update diagram'],['F1','Shortcuts']]};
  if(space)return {mode:'Space · Pan',keys:[['W A S D','Pan canvas']]};
  if(shift)return {mode:'Shift · Create',keys:[['P','Participant'],['A','Actor']]};
  if(connecting)return {mode:'Draw message',keys:[...(target?[['Enter','Connect to '+target]]:[]),['W A S D','Choose participant'],['Click participant','Connect'],['Esc','Cancel']]};
  return {mode:selection?.kind==='message'?'Message':selection?'Participant':'Sequence',keys:[['N','New participant'],['Shift','Participant / actor'],...(selection?[['E','Label'],['R','Type / style'],...(selection.kind==='participant'?[['F2','ID'],['C','Draw message']]:[]),['X / Del / ⌫','Delete']]:[]),['Q','Menu'],['W A S D','Navigate'],['Space','Pan'],['F1','Shortcuts']]};
 }
 return {prepare,attach,invalidate,hints,get active(){return active;},get editable(){return editable;},get error(){return model?.error;},cancel(){actionRevision++;renamedParticipants.clear();connecting=null;target=null;dragFrom=null;paint();}};
}
