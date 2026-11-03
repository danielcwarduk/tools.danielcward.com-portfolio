export const diagramTemplates=[
 {id:'flowchart',name:'Flowchart',detail:'Steps and decisions',visual:true,source:'flowchart TD\n    Start([Start])\n    Process[Do something]\n    Finish([Finish])\n    Start --> Process\n    Process --> Finish\n'},
 {id:'sequence',name:'Sequence',detail:'Participants and messages',visual:true,source:'sequenceDiagram\n    actor User\n    participant App\n    participant API\n    User->>App: Send request\n    App->>+API: Fetch data\n    API-->>-App: Return data\n    App-->>User: Show result\n'},
 {id:'state',name:'State',detail:'States and transitions',source:'stateDiagram-v2\n    [*] --> Ready\n    Ready --> Working: Start\n    Working --> Ready: Finish\n    Ready --> [*]: Close\n'},
 {id:'class',name:'Class',detail:'Classes and relationships',source:'classDiagram\n    class User {\n        +String name\n        +signIn()\n    }\n    class Account {\n        +String email\n    }\n    User --> Account: owns\n'},
 {id:'er',name:'Entity relationship',detail:'Entities and fields',source:'erDiagram\n    CUSTOMER ||--o{ ORDER : places\n    CUSTOMER {\n        int id PK\n        string name\n    }\n    ORDER {\n        int id PK\n        int customer_id FK\n    }\n'},
 {id:'gantt',name:'Gantt',detail:'Tasks and dates',source:'gantt\n    title Project plan\n    dateFormat YYYY-MM-DD\n    section Delivery\n    Plan :a, 2026-01-01, 3d\n    Build :b, after a, 5d\n    Review :after b, 2d\n'},
 {id:'pie',name:'Pie',detail:'Parts of a whole',source:'pie title Time allocation\n    "Design" : 30\n    "Build" : 50\n    "Review" : 20\n'},
 {id:'timeline',name:'Timeline',detail:'Events over time',source:'timeline\n    title Project milestones\n    Plan : Agree scope\n    Build : Create first version\n    Launch : Share the result\n'},
 {id:'mindmap',name:'Mind map',detail:'Ideas and branches',source:'mindmap\n    root((Project))\n        Ideas\n            Research\n            Sketch\n        Delivery\n            Build\n            Review\n'},
 {id:'journey',name:'User journey',detail:'Experiences and stages',source:'journey\n    title Using a tool\n    section Get started\n      Find the tool: 4: User\n      Create a diagram: 5: User\n    section Finish\n      Export the result: 5: User\n'},
];
export function diagramType(source){
 const lines=source.replace(/^\uFEFF/,'').split(/\r?\n/);let frontmatter=false,first=true;
 for(const raw of lines){const line=raw.trim();if(!line||line.startsWith('%%'))continue;if(first&&line==='---'){frontmatter=true;first=false;continue;}first=false;if(frontmatter){if(line==='---')frontmatter=false;continue;}
 const patterns=[['flowchart',/^(flowchart|graph)\b/],['sequence',/^sequenceDiagram\b/],['state',/^stateDiagram(?:-v2)?\b/],['class',/^classDiagram\b/],['er',/^erDiagram\b/],['gantt',/^gantt\b/],['pie',/^pie\b/],['timeline',/^timeline\b/],['mindmap',/^mindmap\b/],['journey',/^journey\b/]];
 return patterns.find(([,pattern])=>pattern.test(line))?.[0]||'other';
 }return 'other';
}
export function diagramName(type){return diagramTemplates.find(t=>t.id===type)?.name||'Diagram';}
export function showNewDiagram(dialog,{onCreate,onClose}){
 if(dialog.open)dialog.close();dialog.className='new-diagram-dialog';dialog.setAttribute('aria-label','New diagram');
 dialog.innerHTML='<form><h2>New diagram</h2><p class="new-intro">Choose a starting point.</p><div class="diagram-templates" role="group" aria-label="Diagram type"></div><p class="new-warning">Creating a diagram replaces the current one. Save a source copy first, or use Undo to go back.</p><div class="dialog-actions"><button type="button" class="new-cancel">Cancel</button><button type="submit" class="primary">Create flowchart</button></div></form>';
 const grid=dialog.querySelector('.diagram-templates'),submit=dialog.querySelector('[type=submit]');let chosen=diagramTemplates[0];
 for(const template of diagramTemplates){const button=document.createElement('button');button.type='button';button.dataset.template=template.id;button.setAttribute('aria-pressed',String(template===chosen));const title=document.createElement('strong'),detail=document.createElement('span'),mode=document.createElement('small');title.textContent=template.name;detail.textContent=template.detail;mode.textContent=template.visual?'Visual + source':'Source + preview';button.append(title,detail,mode);button.onclick=()=>{chosen=template;for(const b of grid.children)b.setAttribute('aria-pressed',String(b===button));submit.textContent='Create '+template.name.toLowerCase();};grid.append(button);}
 dialog.querySelector('.new-cancel').onclick=()=>{dialog.close();onClose?.();};dialog.querySelector('form').onsubmit=e=>{e.preventDefault();onCreate(chosen.source);dialog.close();onClose?.();};dialog.showModal();grid.querySelector('button').focus();
}
