import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));const assert=(v,m)=>{if(!v)throw Error(m);};
await page.addInitScript(()=>localStorage.setItem('mermaid-show-tips','false'));
await page.goto(process.env.SITE_URL||'http://127.0.0.1:5176/mermaid/');
async function ready(){await page.waitForFunction(()=>document.querySelector('#canvas')?.dataset.editable==='true');}
await ready();
async function set(source){await page.locator('.cm-content').click();await page.keyboard.press('ControlOrMeta+a');await page.keyboard.insertText(source);await ready();await page.locator('#zoom-preset').selectOption('fit');}
for(const [name,source] of [
 ['horizontal','flowchart LR\nA[Alpha]\nB[Beta]\nA -->|Choose this route| B\n'],
 ['vertical','flowchart TD\nA[Alpha]\nB[Beta]\nA -->|Choose this route| B\n'],
 ['parallel','flowchart LR\nA[Alpha]\nB[Beta]\nA -->|First route| B\nA -.->|Second route| B\n'],
 ['loop','flowchart LR\nA[Alpha]\nA ==>|Try again| A\n'],
 ['branching','flowchart TD\nA[Start]\nB{Ready?}\nC[Continue]\nD[Revise]\nA --> B\nB -->|Yes| C\nB -.->|Not yet| D\nD --> A\n'],
 ['multiline','flowchart LR\nA[Alpha]\nB[Beta]\nA -->|"First line#10;Second line"| B\n']
]){
 await set(source);
 const checks=await page.locator('.flowchart-link').evaluateAll(edges=>edges.map(edge=>{const match=[...document.querySelectorAll('g.edgeLabel')].find(label=>(()=>{const id=label.querySelector('[data-id]')?.getAttribute('data-id');return id&&(edge.id===id||edge.id.endsWith('-'+id));})());if(!match||!match.textContent.trim())return {ok:true};const mask=document.getElementById(edge.getAttribute('mask')?.slice(5,-1));return {ok:!!mask&&mask.querySelectorAll('polygon').length===1&&getComputedStyle(match).backgroundColor==='rgba(0, 0, 0, 0)',mask:edge.getAttribute('mask')};}));
 assert(checks.every(x=>x.ok)&&await page.locator('mask[data-edge-label-gap]').count()===await page.locator('g.edgeLabel').evaluateAll(xs=>xs.filter(x=>x.textContent.trim()).length),name+JSON.stringify(checks));
 console.log('PASS label gaps for '+name);
 if(name==='horizontal'){
  await page.screenshot({path:'verification-results/transparent-label-gap.png'});
  await page.locator('g.edgeLabel').dblclick();assert(await page.locator('.connection-editor').isVisible(),'Label no longer editable');await page.locator('input[name=edge-label]').fill('Edited route');await page.waitForFunction(()=>document.querySelector('.connection-editor')?.dataset.saveState==='saved'&&document.querySelector('#canvas').dataset.editable==='true');assert(await page.locator('mask[data-edge-label-gap] polygon').count()===1,'Gap lost on edit: '+await page.evaluate(()=>JSON.stringify({masks:document.querySelectorAll('mask[data-edge-label-gap] polygon').length,edges:[...document.querySelectorAll('.flowchart-link')].map(e=>({id:e.id,mask:e.getAttribute('mask')})),labels:[...document.querySelectorAll('g.edgeLabel')].map(e=>({id:e.querySelector('[data-id]')?.getAttribute('data-id'),text:e.textContent}))})));await page.keyboard.press('Escape');await page.locator('#zoom-preset').selectOption('300');assert(await page.locator('mask[data-edge-label-gap] polygon').count()===1,'Gap lost on zoom');
 }
}
assert(errors.length===0,errors.join('\n'));console.log('PASS label editing, redraw and zoom; no browser errors');await browser.close();
