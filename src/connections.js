// Standard Mermaid edge tokens; arrowheads and stroke style are independent.
export const connectionStyles=[
 {id:'solid',name:'Solid',tokens:['---','-->','<--','<-->']},
 {id:'dashed',name:'Dashed',tokens:['-.-','-.->','<-.-','<-.->']},
 {id:'thick',name:'Thick',tokens:['===','==>','<==','<==>']}
];
export const connectionPattern=connectionStyles.flatMap(s=>s.tokens.filter((_,i)=>i!==2)).sort((a,b)=>b.length-a.length).map(s=>s.replaceAll('.',String.fromCharCode(92)+'.')).join('|');
export function connectionSettings(type){for(const style of connectionStyles){const i=style.tokens.indexOf(type);if(i>=0)return {style:style.id,start:!!(i&2),end:!!(i&1)};}throw Error('This connection syntax cannot be edited safely.');}
export function connectionToken(style,start,end){const item=connectionStyles.find(s=>s.id===style);if(!item)throw Error('Unknown connection style.');return item.tokens[(start?2:0)+(end?1:0)];}
// Mermaid uses #quot; / #124; entity syntax (without a leading ampersand).
const entities={amp:'&',quot:'"',lt:'<',gt:'>','10':String.fromCharCode(10),'124':'|','35':'#'};
export function decodeConnectionLabel(text){let s=text.trim();if(s.startsWith('"')&&s.endsWith('"'))s=s.slice(1,-1);return s.replace(/(?:&(#10|#124|#35|amp|quot|lt|gt);|#(10|124|35|amp|quot|lt|gt);)/g,(_,html,mermaid)=>entities[(html||mermaid).replace('#','')]);}
export function encodeConnectionLabel(text){const escaped={'#':'#35;','&':'#amp;','"':'#quot;','<':'#lt;','>':'#gt;','|':'#124;',[String.fromCharCode(10)]:'#10;'};return [...String(text)].map(c=>escaped[c]??c).join('');}
// The UI labels endpoints by stable ID order; Mermaid encodes start-only arrows by reversing the source endpoints.
export function displayConnection(edge){if(edge.from>edge.to){const settings=connectionSettings(edge.type);return {...edge,from:edge.to,to:edge.from,type:connectionToken(settings.style,settings.end,settings.start)};}return {...edge};}
export function mermaidConnection(edge){const settings=connectionSettings(edge.type);if(settings.start&&!settings.end)return {...edge,from:edge.to,to:edge.from,type:connectionToken(settings.style,false,true)};return edge;}
