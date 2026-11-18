import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {diagramTemplates} from '../src/diagram-types.js';

const browser = await chromium.launch();
const page = await browser.newPage({viewport:{width:1440,height:1000}});
page.setDefaultTimeout(10000);
const errors=[]; page.on('pageerror',error=>errors.push(error.message));
const base=diagramTemplates.find(item=>item.id==='er').source;
const source=()=>page.evaluate(()=>localStorage.getItem('mermaid-source'));
const entity=id=>page.locator(`[data-er-entity="${id}"]`);
async function ready(editable=true){try{await page.waitForFunction(value=>document.querySelector('#canvas')?.dataset.editable===String(value)&&!document.querySelector('#export').disabled,editable);}catch(error){throw Error(JSON.stringify({wanted:editable,actual:await page.locator('#canvas').getAttribute('data-editable'),notice:await page.locator('#notice').textContent(),status:await page.locator('#status').textContent(),source:await source()}));}}
async function set(text,editable=true){await page.locator('.cm-content').click();await page.keyboard.press('ControlOrMeta+a');await page.keyboard.insertText(text);await ready(editable);}
async function saved(){try{await page.waitForFunction(()=>document.querySelector('#menu .context-editor')?.dataset.saveState==='saved'&&document.querySelector('#canvas').dataset.editable==='true');}catch(error){throw Error(JSON.stringify({status:await page.locator('#status').textContent(),state:await page.locator('#menu .context-editor').getAttribute('data-save-state'),feedback:await page.locator('#menu .error').allTextContents(),src:await source()}));}}
await page.addInitScript(text=>{localStorage.setItem('mermaid-show-tips','false');localStorage.setItem('mermaid-source',text);},base);
await page.goto(process.env.SITE_URL||'http://127.0.0.1:5176/mermaid/'); await ready();
assert.equal(await page.locator('g.node[data-er-entity]').count(),2);
await entity('CUSTOMER').focus(); await page.keyboard.press('Space'); assert.equal(await entity('CUSTOMER').getAttribute('aria-pressed'),'true');
await page.keyboard.press('Enter');
assert.equal(await page.locator('[name=id]').inputValue(),'CUSTOMER');
assert.equal(await page.locator('.er-field-row').count(),2);
await page.locator('[name=id]').fill('CLIENT');
const rows=page.locator('.er-field-row');
await rows.nth(1).locator('[name=type]').fill('varchar');
await rows.nth(1).locator('[name=name]').fill('display_name');
await rows.nth(1).locator('[name=key]').selectOption('UK');
await page.getByRole('button',{name:'Add field'}).click();
const last=page.locator('.er-field-row').last(); await last.locator('[name=type]').fill('int'); await last.locator('[name=name]').fill('age'); await last.locator('[name=key]').selectOption('');
await last.getByRole('button',{name:'Move field earlier'}).click(); await saved();
assert((await source()).indexOf('int age') < (await source()).indexOf('varchar display_name'));
await page.locator('.er-field-row').nth(1).getByRole('button',{name:'Delete field'}).click(); await saved();
assert(!(await source()).includes('int age')); 
assert((await source()).includes('CLIENT {')); assert((await source()).includes('CLIENT ||--o{ ORDER : places')); assert((await source()).includes('varchar display_name UK'));
assert.equal(await entity('CLIENT').count(),1);
await page.locator('#canvas').focus(); await page.keyboard.press('n'); await ready();
assert((await source()).includes('Entity1')); assert.equal(await entity('Entity1').count(),1);
await entity('Entity1').focus(); await page.keyboard.press('Enter'); await page.locator('[name=id]').fill('DELIVERY'); await saved();
assert((await source()).includes('DELIVERY'));
await page.getByRole('button',{name:'Delete entity'}).click(); await ready(); assert(!(await source()).includes('DELIVERY'), JSON.stringify({src:await source(),status:await page.locator('#status').textContent()}));
await page.locator('#canvas').focus(); await page.keyboard.press('Control+z'); await ready(); assert((await source()).includes('DELIVERY'));
await page.locator('#canvas').focus(); await page.keyboard.press('Control+y'); await ready(); assert(!(await source()).includes('DELIVERY'));

await page.locator('#canvas').focus(); await page.locator('path.relationshipLine[data-er-relationship="0"]').focus(); await page.keyboard.press('Enter');
await page.locator('[name=from]').selectOption('ORDER'); await page.locator('[name=to]').selectOption('CLIENT');
await page.locator('[name=leftCardinality]').selectOption('||'); await page.locator('[name=style]').selectOption('..'); await page.locator('[name=rightCardinality]').selectOption('o{'); await page.locator('[name=label]').fill('contains'); assert.equal(await page.locator('[name=rightCardinality]').inputValue(),'o{'); await page.waitForFunction(()=>localStorage.getItem('mermaid-source').includes('ORDER ||..o{ CLIENT : contains')); await saved();
assert((await source()).includes('ORDER ||..o{ CLIENT : contains'));
await page.getByRole('button',{name:'Reverse direction'}).click(); await page.waitForFunction(()=>localStorage.getItem('mermaid-source').includes('CLIENT }o..|| ORDER : contains')); await saved(); assert((await source()).includes('CLIENT }o..|| ORDER : contains'));

await page.locator('#canvas').focus(); await page.keyboard.press('c');
await page.locator('[name=from]').selectOption('CLIENT'); await page.locator('[name=to]').selectOption('ORDER'); await page.locator('[name=leftCardinality]').selectOption('||'); await page.locator('[name=style]').selectOption('--'); await page.locator('[name=rightCardinality]').selectOption('o{'); await page.locator('[name=label]').fill('owns');
await page.getByRole('button',{name:'Add relationship'}).click(); await ready(); assert.equal(await page.locator('path.relationshipLine[data-er-relationship]').count(),2);
await page.locator('path.relationshipLine[data-er-relationship="0"]').focus(); await page.keyboard.press('Enter');
await page.getByRole('button',{name:'Move later'}).click(); await ready(); assert((await source()).indexOf('CLIENT ||--o{ ORDER : owns') < (await source()).indexOf('CLIENT }o..|| ORDER : contains'));
await page.locator('path.relationshipLine[data-er-relationship="1"]').focus(); await page.keyboard.press('Enter'); await page.getByRole('button',{name:'Delete relationship'}).click(); await ready(); assert(!(await source()).includes('CLIENT }o..|| ORDER : contains'));
await page.locator('#canvas').focus(); await page.keyboard.press('Control+z'); await ready(); assert((await source()).includes('CLIENT }o..|| ORDER : contains'));
await page.locator('#canvas').focus(); await page.keyboard.press('Control+y'); await ready(); assert(!(await source()).includes('CLIENT }o..|| ORDER : contains'));

await page.locator('#canvas').focus(); await page.keyboard.press('Escape'); await entity('CLIENT').focus(); await page.keyboard.press('Enter'); await page.getByRole('button',{name:'Delete entity'}).click(); await ready();
assert(!(await source()).includes('CLIENT ||--o{ ORDER : places')); assert((await source()).includes('ORDER {'));
await page.locator('#export').click(); await page.locator('[name=format]').selectOption('svg'); const download=page.waitForEvent('download'); await page.locator('.export-dialog [type=submit]').click(); const file=await download; assert((await fs.readFile(await file.path(),'utf8')).includes('erDiagram'));
const markerPairs=[['|o','o|'],['||','||'],['}o','o{'],['}|','|{']]; const markerRows=[],markerEntities=[]; for(let i=0;i<markerPairs.length;i++) for(const style of ['--','..']) {const from=`A${i}${style==='..'?'D':'S'}`,to=`B${i}${style==='..'?'D':'S'}`; markerRows.push(`  ${from} ${markerPairs[i][0]}${style}${markerPairs[i][1]} ${to} : marker${i}${style}`); markerEntities.push(`  ${from}`,`  ${to}`);} const markerSource='erDiagram\n'+[...markerRows,...markerEntities].join('\n')+'\n';
await set(markerSource); assert.equal(await page.locator('path.relationshipLine[data-er-relationship]').count(),8); assert.equal(await page.locator('#canvas').getAttribute('data-editable'),'true');
const unsupported='erDiagram\n  CUSTOMER {\n    string name\n  }\n  ORDER {\n    int id PK\n  }\n  CUSTOMER ||--o{ ORDER : places\n  %% comment\n';
await set(unsupported,false); assert.equal(await source(),unsupported); await page.locator('#canvas').focus(); await page.keyboard.press('n'); assert.equal(await source(),unsupported); assert.equal(await page.locator('#scene svg').count(),1);
assert.deepEqual(errors,[]); await browser.close(); console.log('PASS ER entity and field editing, raw relations, history, export and fallback');
