// A deliberately bounded sequence editor. Unrecognised syntax is never rewritten.
export const messageStyles=[['->>','Solid arrow'],['-->>','Dashed arrow'],['->','Solid open'],['-->','Dashed open'],['-)','Async arrow'],['--)','Dashed async'],['-x','Cross'],['--x','Dashed cross']];
const identifier=/^[A-Za-z_][A-Za-z0-9_]*$/;
const reserved=new Set(['end','sequenceDiagram','participant','actor','activate','deactivate','loop','alt','else','opt','par','and','rect','box','note','Note','autonumber','create','destroy','break','critical','option']);
export const validParticipantId=id=>identifier.test(id)&&!reserved.has(id);
const decode=text=>{if(/<[^>]*>/.test(text.replace(/<br\s*\/?\s*>/gi,'')))throw Error('Formatted labels are available in source preview; edit this sequence in source.');return text.replace(/<br\s*\/?\s*>/gi,'\n').replace(/#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));};
const encode=text=>text.replace(/[#;<>]/g,char=>({'#':'#35;',';':'#59;','<':'#60;','>':'#62;'}[char])).replaceAll('\n','<br/>');
export function parseSequence(source){
 const m={participants:[],events:[],error:null};let header=false;const declared=new Set();
 const ensure=id=>{let p=m.participants.find(p=>p.id===id);if(!p){p={id,label:id,type:'participant',declared:false};m.participants.push(p);}return p;};
 try{for(const [line,raw]of source.split(/\r?\n/).entries()){
  const text=raw.trim();if(!text||text.startsWith('%%')){m.events.push({kind:'raw',raw});continue;}
  if(!header){if(text!=='sequenceDiagram')throw Error('Sequence visual editing requires a plain sequenceDiagram header.');header=true;m.events.push({kind:'header',raw});continue;}
  if(text.includes('$$'))throw Error('Math labels are available in source preview; edit this sequence in source.');
  if(text.replace(/#[0-9]+;/g,'').includes(';'))throw Error(`Line ${line+1} uses multiple statements or an unsupported separator. Edit it in source; preview and export remain available.`);
  let a;
  if(a=text.match(/^(participant|actor)\s+([A-Za-z_][\w]*)(?:\s+as\s+(.+))?$/)){
   if(!validParticipantId(a[2])||declared.has(a[2]))throw Error('Use unique participant identifiers.');declared.add(a[2]);const p=ensure(a[2]);Object.assign(p,{type:a[1],label:decode(a[3]||a[2]),declared:true});m.events.push({kind:'participant',id:p.id,raw});continue;
  }
  if(a=text.match(/^([A-Za-z_][\w]*)\s*(-->>|->>|-->|->|--x|-x|--\)|-\))([+-]?)\s*([A-Za-z_][\w]*)\s*:\s*(.*)$/)){
   if(!validParticipantId(a[1])||!validParticipantId(a[4]))throw Error('Unsupported participant identifier.');ensure(a[1]);ensure(a[4]);m.events.push({kind:'message',from:a[1],to:a[4],arrow:a[2],activation:a[3],label:decode(a[5]),raw});continue;
  }
  if(a=text.match(/^(activate|deactivate)\s+([A-Za-z_][\w]*)$/)){ensure(a[2]);m.events.push({kind:a[1],id:a[2],raw});continue;}
  if(a=text.match(/^Note\s+(over|left of|right of)\s+([A-Za-z_][\w]*)(?:\s*,\s*([A-Za-z_][\w]*))?\s*:\s*(.*)$/i)){if(a[3]&&a[1].toLowerCase()!=='over')throw Error('Unsupported note placement.');ensure(a[2]);if(a[3])ensure(a[3]);m.events.push({kind:'note',placement:a[1],ids:[a[2],a[3]].filter(Boolean),label:decode(a[4]),raw});continue;}
  if(/^autonumber(?:\s+\d+(?:\s+\d+)?)?$/.test(text)){m.events.push({kind:'raw',raw});continue;}
  throw Error(`Line ${line+1} uses advanced sequence syntax. Edit it in source; preview and export remain available.`);
 }if(!header)throw Error('Add a sequenceDiagram header.');validateSequence(m);
 }catch(e){m.error=e.message;}return m;
}
export function validateSequence(m){
 const ids=new Set();for(const p of m.participants){if(!validParticipantId(p.id)||ids.has(p.id))throw Error('Use unique IDs with letters, digits and underscores.');ids.add(p.id);if(!p.label.trim())throw Error('Enter a participant label.');}
 const active=new Map();const activate=id=>active.set(id,(active.get(id)||0)+1),deactivate=id=>{if(!active.get(id))throw Error('This change ends an activation before it starts. Adjust the activation messages first.');active.set(id,active.get(id)-1);};
 for(const e of m.events){if(e.kind==='message'){if(!ids.has(e.from)||!ids.has(e.to))throw Error('Choose existing participants.');if(!messageStyles.some(([token])=>token===e.arrow))throw Error('Choose a supported message style.');if(e.activation==='+')activate(e.to);if(e.activation==='-')deactivate(e.from);}else if(e.kind==='activate')activate(e.id);else if(e.kind==='deactivate')deactivate(e.id);}
}
export function serializeSequence(m){
 validateSequence(m);
 const rows=m.events.map(e=>{if(e.raw!==undefined)return e.raw;switch(e.kind){case 'header':return 'sequenceDiagram';case 'participant':{const p=m.participants.find(p=>p.id===e.id);return `    ${p.type} ${p.id}${p.label!==p.id?' as '+encode(p.label):''}`;}case 'message':return `    ${e.from}${e.arrow}${e.activation||''}${e.to}: ${encode(e.label)}`;case 'activate':case 'deactivate':return `    ${e.kind} ${e.id}`;case 'note':return `    Note ${e.placement} ${e.ids.join(',')}: ${encode(e.label)}`;default:return '';}});
 return rows.join('\n').trimEnd()+'\n';
}
export const sequenceMessages=m=>m.events.filter(e=>e.kind==='message');
function materializeParticipants(m){if(m.participants.every(p=>p.declared))return;m.events=m.events.filter(e=>e.kind!=='participant');const header=m.events.findIndex(e=>e.kind==='header');m.events.splice(header+1,0,...m.participants.map(p=>({kind:'participant',id:p.id})));for(const p of m.participants)p.declared=true;}
export function updateParticipant(m,id,patch){
 materializeParticipants(m);
 const p=m.participants.find(p=>p.id===id);if(!p)throw Error('This participant no longer exists.');const next=patch.id??id;if(!validParticipantId(next)||m.participants.some(p=>p.id===next&&p.id!==id))throw Error('Use a unique ID with letters, digits and underscores.');Object.assign(p,patch);
 let declaration=false;for(const e of m.events){let changed=false;if(e.id===id){e.id=next;changed=true;if(e.kind==='participant')declaration=true;}for(const end of ['from','to'])if(e[end]===id){e[end]=next;changed=true;}if(e.ids?.includes(id)){e.ids=e.ids.map(value=>value===id?next:value);changed=true;}if(changed)delete e.raw;}
 if(!declaration){const at=m.events.findIndex(e=>!['raw','header','participant'].includes(e.kind));m.events.splice(at<0?m.events.length:at,0,{kind:'participant',id:next});p.declared=true;}
}
export function addParticipant(m,type='participant'){
 materializeParticipants(m);
 let i=1;while(m.participants.some(p=>p.id==='Participant'+i))i++;const id='Participant'+i;
 m.participants.push({id,label:id,type,declared:true});const at=m.events.findIndex(e=>!['raw','header','participant'].includes(e.kind));m.events.splice(at<0?m.events.length:at,0,{kind:'participant',id});return id;
}
export function removeParticipant(m,id){
 m.participants=m.participants.filter(p=>p.id!==id);
 m.events=m.events.filter(e=>!(e.id===id||e.from===id||e.to===id||e.ids?.includes(id)));
 // Removing a call also removes its activation start. Drop only newly unmatched
 // activation endings so deleting a participant always leaves a renderable diagram.
 const active=new Map();m.events=m.events.filter(e=>{if(e.kind==='activate'){active.set(e.id,(active.get(e.id)||0)+1);}else if(e.kind==='deactivate'){if(!active.get(e.id))return false;active.set(e.id,active.get(e.id)-1);}else if(e.kind==='message'){if(e.activation==='+')active.set(e.to,(active.get(e.to)||0)+1);if(e.activation==='-'){if(!active.get(e.from)){e.activation='';delete e.raw;}else active.set(e.from,active.get(e.from)-1);}}return true;});
}
export function updateMessage(m,index,patch){const e=sequenceMessages(m)[index];if(!e)throw Error('This message no longer exists.');Object.assign(e,patch);delete e.raw;validateSequence(m);}
export function removeMessage(m,index){const e=sequenceMessages(m)[index];if(!e)throw Error('This message no longer exists.');m.events.splice(m.events.indexOf(e),1);const active=new Map();m.events=m.events.filter(event=>{if(event.kind==='activate')active.set(event.id,(active.get(event.id)||0)+1);if(event.kind==='deactivate'){if(!active.get(event.id))return false;active.set(event.id,active.get(event.id)-1);}if(event.kind==='message'){if(event.activation==='+')active.set(event.to,(active.get(event.to)||0)+1);if(event.activation==='-'){if(!active.get(event.from)){event.activation='';delete event.raw;}else active.set(event.from,active.get(event.from)-1);}}return true;});validateSequence(m);}
export function moveMessage(m,index,delta){
 const messages=sequenceMessages(m),e=messages[index],other=messages[index+delta];if(!e||!other)return index;
 const at=m.events.indexOf(e),to=m.events.indexOf(other);[m.events[at],m.events[to]]=[m.events[to],m.events[at]];validateSequence(m);return index+delta;
}
