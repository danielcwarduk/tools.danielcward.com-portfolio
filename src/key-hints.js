export function keyHints({focus,valid,shift,alt,control,space,contextGrid,connecting,connectionTarget,nodes,group,edge,inGroup}){
 if(focus==='reverse')return {mode:'Connection',keys:[['Enter','Reverse direction'],['R','Line type'],['F','Colour'],['E','Label'],['F2','ID'],['Esc','Dismiss'],['Ctrl / ⌘ + Z','Undo']]};
 if(focus==='zoom')return {mode:'Zoom controls',keys:[['↑ / ↓','Adjust'],['Tab','Next control']]};
 if(focus==='text')return {mode:'Editing text',keys:[['Type','Edit text'],['Esc','Close menu']]};
 if(focus==='source')return {mode:'Source',keys:[['Ctrl / ⌘ + Z','Undo'],['Ctrl + ] / [','Indent / outdent']]};
 if(focus==='dialog')return {mode:'Dialog',keys:[['Tab','Next control'],['Esc','Close']]};
 if(focus==='context'){const keys=[];if(contextGrid)keys.push(['← ↑ ↓ →','Choose']);keys.push(['Enter',contextGrid?'Apply':'Activate']);if(!group)keys.push(['R',edge?'Line type':'Shape'],['F','Colour']);keys.push(['E','Label'],['F2','ID'],['Esc','Close']);return {mode:edge?'Edit connection':group?'Edit subgraph':'Edit shape',keys};}
 if(focus!=='canvas')return {mode:'Canvas shortcuts',keys:[['Click canvas','Activate'],['F1','All shortcuts']]};
 if(!valid)return {mode:'Preview updating',keys:[['F1','All shortcuts']]};
 if(control)return {mode:'History',keys:shift||alt?[]:[['Z','Undo'],['Y','Redo']]};
 if(shift)return {mode:'Shift · Create shape',keys:alt?[]:[['R','Rectangle'],['C','Circle'],['D','Diamond'],['B','Database'],['T','Terminator'],['P','Parallelogram'],['F','Document']]};
 if(space&&!alt)return {mode:'Space · Pan',keys:[['W A S D','Pan canvas']]};
 if(connecting)return {mode:'Connect',keys:[...(connectionTarget?[['Enter','Connect to '+connectionTarget]]:[]),['W A S D','Choose destination'],['Click shape','Connect now'],['Esc','Cancel']]};
 if(alt)return {mode:'Alt · Extend selection',keys:[['W A S D','Extend selection']]};
 const keys=[['N',nodes===1?'Add connected shape':'New shape'],['Shift','Shape choices']];
 if(group)keys.push(['E','Label'],['F2','ID'],['U','Ungroup'],['X / Del / ⌫','Delete']);
 else if(edge)keys.push(['R','Line type'],['F','Colour'],['E','Label'],['F2','ID'],['X / Del / ⌫','Delete']);
 else if(nodes){keys.push(['R','Reshape'],['F','Colour'],['E','Label']);if(nodes===1)keys.push(['F2','ID'],['C','Connect']);keys.push(['G','Group']);if(inGroup)keys.push(['U','Ungroup']);keys.push(['X / Del / ⌫','Delete']);}
 keys.push(['Q','Menu'],['W A S D','Navigate'],['Space','Pan'],['F1','All shortcuts']);
 return {mode:group?'Subgraph':edge?'Connection':nodes?nodes===1?'Shape':`${nodes} shapes`:'Canvas',keys};
}
