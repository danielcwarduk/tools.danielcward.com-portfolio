const actorName = /^[A-Za-z0-9_-]+(?:[ ][A-Za-z0-9_-]+)*$/;
function fail(message) { throw new Error(message); }

function validate(model) {
  if (!model.sections.length) fail('Keep at least one journey section.');
  for (const section of model.sections) {
    if (!section.name.trim() || /[\r\n:]/.test(section.name)) fail('Section names must be non-empty single-line text without colons.');
    if (!section.tasks.length) fail('Each visual journey section needs at least one task. Delete the section to remove its final task.');
    for (const task of section.tasks) {
      if (!task.label.trim() || /[\r\n:]/.test(task.label)) fail('Task labels must be non-empty single-line text without colons.');
      if (!Number.isInteger(task.score) || task.score < 1 || task.score > 5) fail('Journey task scores must be from 1 to 5.');
      if (!task.actors.length || task.actors.some(actor => !actorName.test(actor))) fail('Use one or more simple comma-separated actor names.');
    }
  }
}

export function parseJourney(source) {
  const model = {headerRaw:null,title:null,rows:[],sections:[],error:null};
  try {
    const lines=source.split(/\r?\n/),header=lines.shift();
    if (header !== 'journey') fail('Visual journey editing requires a plain journey header. Edit source directly.');
    model.headerRaw=header; model.rows.push({kind:'header',raw:header});
    let sawSection=false, sawTitle=false;
    for(let i=0;i<lines.length;i++) {
      const raw=lines[i];
      if (i===lines.length-1 && raw==='') continue;
      if (!raw.trim()) fail(`Line ${i+2} uses blank formatting outside the visual journey subset. Edit source directly.`);
      if (/^\s*(?:%%|title\b|accTitle\b|accDescr\b|section\b)/i.test(raw) && !/^    (?:title\s+.+|section\s+.+)$/.test(raw)) fail(`Line ${i+2} uses unsupported journey syntax. Edit source directly.`);
      const title=raw.match(/^    title (.+)$/);
      if(title) {
        if(sawTitle||sawSection) fail(`Line ${i+2} places a title outside the supported position. Edit source directly.`);
        sawTitle=true; model.title={text:title[1],originalText:title[1],raw}; model.rows.push({kind:'title',item:model.title}); continue;
      }
      const sectionMatch=raw.match(/^    section (.+)$/);
      if(sectionMatch) {
        if(!sectionMatch[1].trim()||/[:\r\n]/.test(sectionMatch[1])) fail(`Line ${i+2} uses an unsupported section name. Edit source directly.`);
        const section={name:sectionMatch[1],originalName:sectionMatch[1],headerRaw:raw,tasks:[]}; model.sections.push(section); model.rows.push({kind:'section',item:section}); sawSection=true; continue;
      }
      const taskMatch=raw.match(/^      ([^:\r\n]+): ([1-5]): (.+)$/);
      if(taskMatch) {
        if(!sawSection) fail(`Line ${i+2} places a task before a section. Edit source directly.`);
        const actors=taskMatch[3].split(',').map(value=>value.trim());
        if(!actors.length||actors.some(actor=>!actorName.test(actor))) fail(`Line ${i+2} uses unsupported actor syntax. Edit source directly.`);
        model.sections.at(-1).tasks.push({label:taskMatch[1],originalLabel:taskMatch[1],score:Number(taskMatch[2]),originalScore:Number(taskMatch[2]),actors,originalActors:[...actors],raw}); continue;
      }
      fail(`Line ${i+2} uses unsupported journey syntax. Edit source directly.`);
    }
    validate(model);
  } catch(error) { model.error=error.message; }
  return model;
}

function serializeSection(section) {
  const head=section.headerRaw&&section.name===section.originalName?section.headerRaw:'    section '+section.name;
  return [head,...section.tasks.map(task=>task.raw&&task.label===task.originalLabel&&task.score===task.originalScore&&JSON.stringify(task.actors)===JSON.stringify(task.originalActors)?task.raw:`      ${task.label}: ${task.score}: ${task.actors.join(', ')}`)].join('\n');
}
export function serializeJourney(model) {
  validate(model);
  return [model.headerRaw||'journey',...(model.title?[model.title.raw&&model.title.text===model.title.originalText?model.title.raw:`    title ${model.title.text}`]:[]),...model.sections.map(serializeSection)].join('\n')+'\n';
}
export function addJourneySection(model,name) {
  const base=(name||'New section').trim(); let value=base,index=2; while(model.sections.some(section=>section.name===value)) value=`${base} ${index++}`;
  const actors=model.sections.flatMap(item=>item.tasks).flatMap(task=>task.actors);const section={name:value,originalName:undefined,headerRaw:undefined,tasks:[{label:'New task',score:3,actors:[actors[0]||'User'],raw:undefined}]}; model.sections.push(section); model.rows.push({kind:'section',item:section}); validate(model); return model.sections.length-1;
}
export function updateJourneySection(model,index,name) {
  const section=model.sections[index]; if(!section)fail('This journey section no longer exists.');
  const value=String(name).trim(); if(model.sections.some((other,i)=>i!==index&&other.name===value))fail('Journey section names must be unique.');
  section.name=value; validate(model);
}
export function moveJourneySection(model,index,delta) {
  const target=index+delta;if(!model.sections[index]||!model.sections[target])return index;
  [model.sections[index],model.sections[target]]=[model.sections[target],model.sections[index]];
  const rows=model.rows.filter(row=>row.kind==='section'); for(const [i,row] of rows.entries())row.item=model.sections[i];
  return target;
}
export function removeJourneySection(model,index) {
  if(!model.sections[index])fail('This journey section no longer exists.'); if(model.sections.length<=1)fail('Keep at least one journey section.');
  const section=model.sections[index];model.sections.splice(index,1);model.rows.splice(model.rows.findIndex(row=>row.kind==='section'&&row.item===section),1);
}
export function addJourneyTask(model,sectionIndex,label='New task') {
  const section=model.sections[sectionIndex];if(!section)fail('Choose an existing journey section.');
  const actors=model.sections.flatMap(item=>item.tasks).flatMap(task=>task.actors);const task={label,score:3,actors:[actors[0]||'User'],raw:undefined};section.tasks.push(task);validate(model);return section.tasks.length-1;
}
export function updateJourneyTask(model,sectionIndex,taskIndex,patch) {
  const task=model.sections[sectionIndex]?.tasks[taskIndex];if(!task)fail('This journey task no longer exists.');
  const next={...task};
  if(typeof patch==='string')next.label=patch.trim();
  else {
    if(patch.label!==undefined)next.label=String(patch.label).trim();
    if(patch.score!==undefined)next.score=Number(patch.score);
    if(patch.actors!==undefined)next.actors=Array.isArray(patch.actors)?patch.actors.map(value=>String(value).trim()):String(patch.actors).split(',').map(value=>value.trim());
  }
  const candidate=structuredClone(model);candidate.sections[sectionIndex].tasks[taskIndex]=next;validate(candidate);Object.assign(task,next);
}
export function moveJourneyTask(model,sectionIndex,taskIndex,targetSectionIndex,targetTaskIndex) {
  const source=model.sections[sectionIndex],target=model.sections[targetSectionIndex],task=source?.tasks[taskIndex];if(!task||!target)fail('Choose an existing journey task and section.');
  if(source!==target&&source.tasks.length===1)fail('Each section needs at least one task. Delete the section to remove its final task.');
  source.tasks.splice(taskIndex,1);const index=targetTaskIndex===undefined?target.tasks.length:Math.max(0,Math.min(target.tasks.length,targetTaskIndex));target.tasks.splice(index,0,task);return index;
}
export function removeJourneyTask(model,sectionIndex,taskIndex) {
  const section=model.sections[sectionIndex];if(!section?.tasks[taskIndex])fail('This journey task no longer exists.');if(section.tasks.length===1)fail('Each section needs at least one task. Delete the section to remove its final task.');section.tasks.splice(taskIndex,1);
}
