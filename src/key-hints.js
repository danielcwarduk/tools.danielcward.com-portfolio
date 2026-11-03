export function keyHints({focus,valid,shift,alt,control,space,connecting,nodes,group,edge,inGroup}){
 if(focus==='reverse')return {mode:'Connection',keys:[['Enter','Reverse direction'],['E','Edit arrow'],['Esc','Dismiss'],['Ctrl / ⌘ + Z','Undo']]};
 if(focus==='zoom')return {mode:'Zoom controls',keys:[['↑ / ↓','Adjust'],['Tab','Next control']]};
 if(focus==='text')return {mode:'Editing text',keys:[['Type','Edit text'],['Esc','Close menu']]};
 if(focus==='source')return {mode:'Source',keys:[['Tab','Canvas'],['Ctrl / ⌘ + Z','Undo'],['Ctrl + ] / [','Indent / outdent']]};
 if(focus==='dialog')return {mode:'Dialog',keys:[['Tab','Next control'],['Esc','Close']]};
 if(focus!=='canvas')return {mode:'Canvas shortcuts',keys:[['Click canvas','Activate'],['F1','All shortcuts']]};
 if(!valid)return {mode:'Preview updating',keys:[['Tab','Edit source'],['F1','All shortcuts']]};
 if(control)return {mode:'History',keys:shift||alt?[]:[['Z','Undo'],['Y','Redo']]};
 if(shift)return {mode:'Shift · Create shape',keys:alt?[]:[['R','Rectangle'],['C','Circle'],['D','Diamond'],['B','Database'],['T','Terminator'],['P','Parallelogram'],['F','Document']]};
 if(alt)return {mode:'Alt · Extend selection',keys:[['W A S D','Extend selection']]};
 if(space)return {mode:'Space · Pan',keys:[['W A S D','Pan canvas']]};
 if(connecting)return {mode:'Connect',keys:[['Click shape','Destination'],['W A S D','Choose destination'],['Esc','Cancel']]};
 const keys=[['N',nodes===1?'Add connected shape':'New shape'],['Shift','Shape choices']];
 if(group)keys.push(['E','Label'],['F2','ID'],['U','Ungroup'],['X / Del / ⌫','Delete']);
 else if(edge)keys.push(['E','Arrow text'],['X / Del / ⌫','Delete']);
 else if(nodes){keys.push(['R','Reshape'],['E','Label']);if(nodes===1)keys.push(['F2','ID'],['C','Connect']);keys.push(['G','Group']);if(inGroup)keys.push(['U','Ungroup']);keys.push(['X / Del / ⌫','Delete']);}
 keys.push(['Q','Menu'],['W A S D','Navigate'],['Space','Pan'],['F1','All shortcuts']);
 return {mode:group?'Subgraph':edge?'Connection':nodes?nodes===1?'Shape':`${nodes} shapes`:'Canvas',keys};
}
