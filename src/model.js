import {connectionPattern,decodeConnectionLabel,encodeConnectionLabel,mermaidConnection} from './connections';
import {syncColourOverrides,hasUserClasses} from './colours';
export const shapes = [
 ['rect','▭','Process'],['diam','◇','Decision'],['stadium','⬭','Start / end'],['lean-r','▱','Input / output'],['cyl','▤','Database'],['subproc','▣','Subprocess'],['circle','○','Connector'],['doc','▧','Document'],
 ...[['rounded','Rounded'],['hex','Preparation'],['trap-b','Manual operation'],['trap-t','Manual input'],['dbl-circ','Double circle'],['sm-circ','Small circle'],['fr-circ','Framed circle'],['bow-rect','Stored data'],['div-rect','Divided process'],['fr-rect','Framed rectangle'],['cross-circ','Summary'],['tri','Triangle'],['flip-tri','Flipped triangle'],['fork','Fork / join'],['hourglass','Collate'],['bolt','Lightning'],['brace','Comment'],['brace-r','Right comment'],['braces','Both comments'],['delay','Delay'],['h-cyl','Direct access storage'],['lin-cyl','Disk storage'],['curv-trap','Display'],['sl-rect','Manual file'],['st-rect','Multi-process'],['docs','Documents'],['tag-doc','Tagged document'],['tag-rect','Tagged process'],['text','Text'],['notch-rect','Card'],['lin-doc','Lined document'],['lin-rect','Lined process'],['win-pane','Internal storage'],['f-circ','Junction'],['odd','Asymmetric'],['flag','Paper tape']].map(([id,label])=>[id,'▫',label])
];
const ident='[A-Za-z_][A-Za-z0-9_]*';
const legacy=[['([','])','stadium'],['[[',']]','subproc'],['((', '))','circle'],['[(',')]','cyl'],['[/','/]','lean-r'],['[',' ]','rect'],['{','}','diam'],['(',')','rounded']];
function label(s){s=s.trim();if(s.startsWith('"')&&s.endsWith('"'))s=s.slice(1,-1);return s.replaceAll('&quot;','"').replaceAll('&#10;','\n').replaceAll('&amp;','&');}
export function parse(source){
 const m={header:'',nodes:[],edges:[],groups:[],extras:[],error:null};let stack=[]; const fail=(i)=>{throw Error(`Line ${i+1}: syntax outside the safe visual subset. Edit source directly.`)};
 try {source.split('\n').forEach((raw,i)=>{let s=raw.trim();if(!s.startsWith('%%'))s=s.replace(/;$/,'');if(!s)return;
 if(!m.header){if(!/^(flowchart|graph)\s+(TD|TB|BT|LR|RL)$/.test(s))throw Error('Source preview mode: visual editing requires a simple flowchart header.');m.header=s;return;}
 if(s.startsWith('%%')){m.extras.push(s);return;}
 let a;if(a=s.match(new RegExp(`^subgraph (${ident})(?:\\["?([^"\\]]*)"?\\])?$`))){if(m.groups.some(g=>g.id===a[1]))fail(i);m.groups.push({id:a[1],label:label(a[2]||a[1]),parent:stack.at(-1)});stack.push(a[1]);return;}
 if(s==='end'){if(!stack.length)fail(i);stack.pop();return;}
 if(/^(classDef\s|class\s)/.test(s)){m.extras.push(s+';');return;}
 if(a=s.match(new RegExp(String.raw`^(${ident})\s*(${connectionPattern})\s*(?:\|("[^"\n]*"|[^|\n]*)\|\s*)?(${ident})$`))){if(a[3]&&a[3].includes('<'))fail(i);m.edges.push({from:a[1],to:a[4],type:a[2],label:decodeConnectionLabel(a[3]||'')});return;}
 if(a=s.match(new RegExp(`^(${ident})@\\{\\s*shape:\\s*([a-z-]+),\\s*label:\\s*"([^"\\n]*)"\\s*\\}$`))){if(!shapes.some(x=>x[0]===a[2]))fail(i);m.nodes.push({id:a[1],shape:a[2],label:label(a[3]),group:stack.at(-1)});return;}
 if(a=s.match(new RegExp(`^(${ident})(.*)$`))){let rest=a[2].trim();let found=false;for(let [open,close,shape] of legacy){close=close.trim();if(rest.startsWith(open)&&rest.endsWith(close)){const inner=rest.slice(open.length,-close.length);if(!(/^"[^"]*"$/.test(inner)||!/[\[\]{}()\"@;<>]/.test(inner)))fail(i);m.nodes.push({id:a[1],label:label(inner),shape,group:stack.at(-1)});found=true;break;}}if(found)return;}
 fail(i);
 });if(stack.length)throw Error('Unclosed subgraph.');const ids=m.nodes.map(n=>n.id);if(new Set(ids).size!==ids.length||m.groups.some(g=>ids.includes(g.id)))throw Error('Duplicate identifiers disable visual editing.');if(m.edges.some(e=>!ids.includes(e.from)||!ids.includes(e.to)))throw Error('Declare every connected shape separately to enable visual editing.');
 // Only node class assignments can be safely rewritten on delete / rename.
 for(const x of m.extras){const c=x.match(/^class\s+([^ ]+)\s+([A-Za-z_][\w-]*);$/);if(x.startsWith('class ')&&(!c||c[1].split(',').some(id=>!ids.includes(id))))throw Error('Unsupported class assignment; source preserved.');}
 }catch(e){m.error=e.message;}return m;
}
const quote=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('\n','&#10;');
export function serialize(m){let rows=[m.header];function emit(parent,depth){const pad='    '.repeat(depth);for(const n of m.nodes.filter(n=>n.group===parent))rows.push(`${pad}${n.id}@{ shape: ${n.shape}, label: "${quote(n.label)}" }`);for(const g of m.groups.filter(g=>g.parent===parent)){rows.push(`${pad}subgraph ${g.id}["${quote(g.label)}"]`);emit(g.id,depth+1);rows.push(`${pad}end`);}}emit(undefined,1);rows.push('',...m.edges.map(mermaidConnection).map(e=>`    ${e.from} ${e.type}${e.label?'|"'+encodeConnectionLabel(e.label)+'"|':''} ${e.to}`));return [...rows,'',...m.extras].join('\n').trim()+'\n';}
export function rewriteClasses(m,oldId,newId){m.extras=m.extras.flatMap(x=>{const a=x.match(/^class\s+([^ ]+)\s+(\S+);$/);if(!a)return [x];const ids=a[1].split(',').flatMap(id=>id===oldId?(newId?[newId]:[]):[id]);return ids.length?[`class ${ids.join(',')} ${a[2]};`]:[];});}
export function colors(m){const start='%% --- Visual editor default colors (editable; editor palette, not ISO colors) ---';if(m.extras.some(x=>x.startsWith('%% --- Visual editor default colors')))throw Error('Color block already exists. Edit it directly; existing custom colors are preserved.');if(hasUserClasses(m))throw Error('Existing classes detected. Remove or edit those styles in source before appending defaults.');m.extras.push(start,'classDef flowTerminator fill:#dcfce7,stroke:#16a34a,color:#14532d;','classDef flowProcess fill:#dbeafe,stroke:#2563eb,color:#1e3a8a;','classDef flowDecision fill:#fef3c7,stroke:#d97706,color:#78350f;');syncColors(m);}
function syncCategoryColors(m){if(!m.extras.some(x=>x.startsWith('%% --- Visual editor default colors')))return;m.extras=m.extras.filter(x=>!/^class .* flow(Terminator|Process|Decision);$/.test(x));for(const [cat,pred] of [['Terminator',n=>['stadium','circle','dbl-circ'].includes(n.shape)],['Decision',n=>n.shape==='diam'],['Process',n=>!['stadium','circle','dbl-circ','diam'].includes(n.shape)]]){const ids=m.nodes.filter(pred).map(n=>n.id);if(ids.length)m.extras.push(`class ${ids.join(',')} flow${cat};`);}}

export function syncColors(m){syncCategoryColors(m);syncColourOverrides(m);}
