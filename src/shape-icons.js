// Miniatures of Mermaid's own flowchart geometries, rather than generic symbols.
// Reference: https://mermaid.js.org/syntax/flowchart.html#complete-list-of-new-shapes
const rect='<rect x="4" y="7" width="28" height="22"/>';
const doc='<path d="M5 5H31V27C20 20 16 34 5 27Z"/>';
const cylinder='<path d="M5 9V27C5 34 31 34 31 27V9M5 9C5 2 31 2 31 9S5 16 5 9Z"/>';
const leftBrace='<path d="M13 3Q5 3 8 12Q10 18 3 18Q10 18 8 24Q5 33 13 33"/>';
const rightBrace='<path d="M23 3Q31 3 28 12Q26 18 33 18Q26 18 28 24Q31 33 23 33"/>';
export const shapeIconBodies={
 rect,diam:'<path d="M18 3 34 18 18 33 2 18Z"/>',stadium:'<rect x="2" y="9" width="32" height="18" rx="9"/>',
 'lean-r':'<path d="M9 7H34L27 29H2Z"/>',cyl:cylinder,
 subproc:rect+'<path d="M9 7V29M27 7V29"/>',circle:'<circle cx="18" cy="18" r="14"/>',doc,
 rounded:'<rect x="4" y="7" width="28" height="22" rx="5"/>',hex:'<path d="M10 7H26L34 18 26 29H10L2 18Z"/>',
 'trap-b':'<path d="M2 7H34L27 29H9Z"/>','trap-t':'<path d="M9 7H27L34 29H2Z"/>',
 'dbl-circ':'<circle cx="18" cy="18" r="14"/><circle cx="18" cy="18" r="10"/>',
 'sm-circ':'<circle cx="18" cy="18" r="6" fill="currentColor"/>',
 'fr-circ':'<circle cx="18" cy="18" r="13"/><circle cx="18" cy="18" r="8" fill="currentColor"/>',
 'bow-rect':'<path d="M6 6H32Q22 18 32 30H6Q-4 18 6 6Z"/>',
 'div-rect':rect+'<path d="M4 13H32"/>','fr-rect':rect+'<rect x="8" y="11" width="20" height="14"/>',
 'cross-circ':'<circle cx="18" cy="18" r="14"/><path d="M8 8 28 28M8 28 28 8"/>',
 tri:'<path d="M18 3 34 31H2Z"/>','flip-tri':'<path d="M2 5H34L18 33Z"/>',
 fork:'<rect x="3" y="14" width="30" height="8" fill="currentColor"/>',
 hourglass:'<path d="M3 5H33L3 31H33Z"/>',bolt:'<path d="M21 2 6 21H17L14 34 31 14H20Z"/>',
 brace:leftBrace,'brace-r':rightBrace,braces:leftBrace+rightBrace,
 delay:'<path d="M4 6H19C36 6 36 30 19 30H4Z"/>',
 'h-cyl':'<path d="M9 6H27C34 6 34 30 27 30H9M9 6C2 6 2 30 9 30S16 6 9 6Z"/>',
 'lin-cyl':cylinder+'<path d="M5 14C5 21 31 21 31 14M5 18C5 25 31 25 31 18"/>',
 'curv-trap':'<path d="M10 6H26C36 6 36 30 26 30H10L2 18Z"/>',
 'sl-rect':'<path d="M4 13 32 5V30H4Z"/>',
 'st-rect':'<path d="M10 3H33V23M7 6H30V26"/><rect x="3" y="10" width="23" height="21"/>',
 docs:'<path d="M11 2H33V23M8 5H30V26"/><path d="M3 9H26V29C17 23 13 34 3 29Z"/>',
 'tag-doc':doc+'<path d="M23 5V13H31"/>','tag-rect':rect+'<path d="M24 7V15H32"/>',
 text:'<path d="M7 6H29M18 6V30M12 30H24"/>',
 'notch-rect':'<path d="M12 6H32V30H4V14Z"/>',
 'lin-doc':doc+'<path d="M9 5V27"/>','lin-rect':rect+'<path d="M9 7V29M13 7V29"/>',
 'win-pane':rect+'<path d="M11 7V29M4 14H32"/>',
 'f-circ':'<circle cx="18" cy="18" r="11" fill="currentColor"/>',
 odd:'<path d="M3 6H26L34 18 26 30H3L11 18Z"/>',
 flag:'<path d="M3 7Q10 1 18 7T33 7V29Q26 35 18 29T3 29Z"/>',
};
export function shapeIcon(shape){const body=shapeIconBodies[shape];if(!body)throw Error('Missing icon for shape '+shape);return '<svg viewBox="0 0 36 36" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+body+'</svg>';}
