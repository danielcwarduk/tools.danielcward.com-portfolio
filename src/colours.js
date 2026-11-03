// Explicit colours are ordinary Mermaid classes. The marked block is editable source.
export const colourPalette=[
 {id:'red',name:'Red',fill:'#fee2e2',stroke:'#dc2626',text:'#7f1d1d'},
 {id:'orange',name:'Orange',fill:'#ffedd5',stroke:'#ea580c',text:'#7c2d12'},
 {id:'yellow',name:'Yellow',fill:'#fef9c3',stroke:'#ca8a04',text:'#713f12'},
 {id:'green',name:'Green',fill:'#dcfce7',stroke:'#16a34a',text:'#14532d'},
 {id:'blue',name:'Blue',fill:'#dbeafe',stroke:'#2563eb',text:'#1e3a8a'},
 {id:'purple',name:'Purple',fill:'#f3e8ff',stroke:'#9333ea',text:'#581c87'},
 {id:'white',name:'White',fill:'#ffffff',stroke:'#94a3b8',text:'#172033'},
 {id:'grey',name:'Grey',fill:'#e5e7eb',stroke:'#6b7280',text:'#1f2937'},
 {id:'black',name:'Black',fill:'#1f2937',stroke:'#111827',text:'#ffffff'}
];
const start='%% --- Mermaid Studio colour overrides (editable) ---';
const end='%% --- End Mermaid Studio colour overrides ---';
const owned=/^studio(?:Edge)?Color_[a-z]+(?:_\d+)?$/;
const classLine=/^class\s+([^ ]+)\s+([A-Za-z_][\w-]*);$/;
const defLine=/^classDef\s+([A-Za-z_][\w-]*)\s+(.+);$/;
const normalize=s=>s.replace(/\s/g,'').toLowerCase();
const properties=(c,kind='node')=>kind==='edge'?`stroke:${c.stroke},color:${c.id==='black'?c.stroke:c.text},fill:none`:`fill:${c.fill},stroke:${c.stroke},color:${c.text}`;
function read(m){const starts=m.extras.flatMap((s,i)=>s===start?[i]:[]),ends=m.extras.flatMap((s,i)=>s===end?[i]:[]);if(!starts.length&&!ends.length)return {outside:[...m.extras],inside:[]};if(starts.length!==1||ends.length!==1||ends[0]<=starts[0])throw Error('Colour override markers are incomplete or duplicated. Repair the commented block in source before editing colours.');return {outside:m.extras.filter((_,i)=>i<starts[0]||i>ends[0]),inside:m.extras.slice(starts[0]+1,ends[0])};}
function definitions(lines){return new Map(lines.flatMap(s=>{const a=s.match(defLine);return a?[[a[1],a[2]]]:[];}));}
function entityColour(m,id,kind){if(!id)return 'default';try{const block=read(m),defs=definitions(block.inside);let name;for(const line of block.inside){const a=line.match(classLine);if(a&&owned.test(a[2])&&a[1].split(',').includes(id))name=a[2];}if(name){const c=colourPalette.find(c=>normalize(properties(c,kind))===normalize(defs.get(name)||''));return c?.id||'custom';}const categoryDefaults=kind==='node'&&m.extras.some(x=>x.startsWith('%% --- Visual editor default colors'));const userStyle=block.outside.some(line=>{const a=line.match(classLine);return a&&a[1].split(',').includes(id)&&!(categoryDefaults&&/^flow(Terminator|Process|Decision)$/.test(a[2]));});return userStyle?'custom':'default';}catch{return 'custom';}}
export function nodeColour(m,id){return entityColour(m,id,'node');}
export function edgeColour(m,id){return entityColour(m,id,'edge');}
export function selectionColour(m,ids){const states=new Set(ids.map(id=>nodeColour(m,id)));return states.size===1?[...states][0]:'mixed';}
export function setNodeColour(m,ids,key){setEntityColour(m,ids,key,'node');}
export function setEdgeColour(m,id,key){setEntityColour(m,[id],key,'edge');}
function setEntityColour(m,ids,key,kind){const targets=new Set(ids.filter(id=>id&&(kind==='edge'?m.edges:m.nodes).some(n=>n.id===id)));if(!targets.size)return;const colour=colourPalette.find(c=>c.id===key);if(key!=='default'&&!colour)throw Error('Unknown colour.');const block=read(m);let inside=block.inside.flatMap(line=>{const a=line.match(classLine);if(!a||!owned.test(a[2]))return [line];const kept=a[1].split(',').filter(id=>!targets.has(id));return kept.length?[`class ${kept.join(',')} ${a[2]};`]:[];});
 if(colour){const props=properties(colour,kind);const defs=definitions(inside);let name=[...defs].find(([name,value])=>owned.test(name)&&normalize(value)===normalize(props))?.[0];if(!name){const allDefs=definitions(m.extras),taken=new Set([...allDefs.keys(),...m.extras.flatMap(line=>{const a=line.match(classLine);return a?[a[2]]:[];})]);name=(kind==='edge'?'studioEdgeColor_':'studioColor_')+key;let i=2;while(taken.has(name))name=(kind==='edge'?'studioEdgeColor_':'studioColor_')+key+'_'+i++;inside.push(`classDef ${name} ${props};`);}const existing=inside.findIndex(line=>line.match(classLine)?.[2]===name);if(existing>=0){const a=inside[existing].match(classLine);inside[existing]=`class ${[...new Set([...a[1].split(','),...targets])].join(',')} ${name};`;}else inside.push(`class ${[...targets].join(',')} ${name};`);}
 m.extras=inside.length?[...block.outside,start,...inside,end]:block.outside;syncColourOverrides(m);}
// Keep standard palette classes shared and remove them when no assignment uses them.
// Definitions edited by the user and references outside our block are preserved.
export function syncColourOverrides(m){
 const block=read(m),defs=definitions(block.inside),standard=new Set([...defs].filter(([name,value])=>owned.test(name)&&colourPalette.some(c=>['node','edge'].some(kind=>normalize(properties(c,kind))===normalize(value)))).map(([name])=>name));
 const live=new Set([...m.nodes,...m.groups,...m.edges].map(n=>n.id).filter(Boolean)),members=new Map();
 for(const line of block.inside){const a=line.match(classLine);if(!a||!standard.has(a[2]))continue;const ids=members.get(a[2])||new Set();for(const id of a[1].split(','))if(live.has(id))ids.add(id);members.set(a[2],ids);}
 const outsideReferences=new Set(block.outside.flatMap(line=>{const a=line.match(classLine);return a?[a[2]]:[];})),emitted=new Set();
 const inside=block.inside.flatMap(line=>{const assignment=line.match(classLine);if(assignment&&standard.has(assignment[2])){const name=assignment[2],ids=members.get(name);if(emitted.has(name)||!ids?.size)return [];emitted.add(name);return [`class ${[...ids].join(',')} ${name};`];}const def=line.match(defLine);if(def&&standard.has(def[1])&&!members.get(def[1])?.size&&!outsideReferences.has(def[1]))return [];return [line];});
 m.extras=inside.length?[...block.outside,start,...inside,end]:block.outside;
}
export function hasUserClasses(m){const block=read(m);return block.outside.some(line=>/^class(?:Def)?\s/.test(line));}
