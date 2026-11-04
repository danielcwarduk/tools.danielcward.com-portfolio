// One registry keeps creation, the Shift hints and the reference dialog in sync.
export const shapeShortcuts=[
 ['r','rect','Rectangle'],['c','circle','Circle'],['d','diam','Diamond'],['b','cyl','Database'],['t','stadium','Terminator'],['p','lean-r','Parallelogram'],['f','doc','Document / file'],
 ['s','subproc','Subprocess'],['h','hex','Hexagon / preparation'],['m','trap-b','Manual operation'],['i','sl-rect','Manual input'],['e','rounded','Event'],['x','tri','Extract'],['j','f-circ','Junction'],['o','bow-rect','Stored data'],['w','win-pane','Window / internal storage'],['l','lin-doc','Lined document'],['a','odd','Asymmetric'],
];
export const creationKeys=Object.fromEntries(shapeShortcuts.map(([key,shape])=>[key,shape]));
