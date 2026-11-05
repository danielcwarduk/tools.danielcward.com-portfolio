import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { formatSource } from '../src/format-source.js';

const er = 'erDiagram\n    CUSTOMER {\n  uuid customer_id PK\nstr name UK\n    string note "optional field"\n    }\n';
const formatted = 'erDiagram\n    CUSTOMER {\n      uuid   customer_id PK\n      str    name        UK\n      string note           "optional field"\n    }\n';
assert.equal(formatSource(er), formatted);
assert.equal(formatSource(formatted), formatted);
assert.equal(formatSource('classDiagram\nclass Account {\n+String name\n+signIn()\n}\n'), 'classDiagram\nclass Account {\n  +String name\n  +signIn()\n}\n');
const prefix = '---\nconfig:\n  layout: elk\n---\n';
assert.equal(formatSource(prefix + er), prefix + formatted);
const complex = 'erDiagram\nCUSTOMER { uuid id PK }\n';
assert.equal(formatSource(complex), complex);

const browser = await chromium.launch();
try {
  const page = await browser.newPage({viewport:{width:1440,height:1000}});
  const base = 'flowchart LR\nA[Alpha]\nsubgraph G[Group]\nB[Beta]\nend\nC[Charlie]\nA -->|First| B\nA -->|Second| B\nB named_0@-->|Third| C\n';
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(source => {
    localStorage.setItem('mermaid-show-tips', 'false');
    localStorage.setItem('mermaid-source', source);
  }, base);
  await page.goto(process.env.SITE_URL || 'http://127.0.0.1:5176/mermaid/');
  const ready = () => page.waitForFunction(() => document.querySelector('#canvas')?.dataset.editable === 'true');
  const savedSource = () => page.evaluate(() => localStorage.getItem('mermaid-source'));
  async function set(source) {
    await page.keyboard.press('Escape');
    await page.locator('.cm-content').focus();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.insertText(source);
    await page.waitForFunction(() => !document.querySelector('#export').disabled);
  }
  await ready();
  assert.equal(await page.locator('.flowchart-link[data-id="L_A_B_0_0"]').count(), 1);
  for (const [preamble, renderer] of [
    [prefix, 'elk'],
    ['%%{init: {"flowchart": {"defaultRenderer": "elk"}}}%%\n', 'elk'],
    ['---\nconfig:\n  layout: dagre\n---\n', 'dagre'],
  ]) {
    await set(preamble + base);
    await ready();
    assert.equal(await page.locator('.flowchart-link[data-id="L_A_B_0'+(renderer==='elk'?'_0':'')+'"]').count(), 1);
    await page.locator('g.edgeLabel').filter({hasText:'Second'}).dblclick();
    await page.locator('input[name=edge-label]').fill('Edited second');
    await page.waitForFunction(() => localStorage.getItem('mermaid-source').includes('Edited second'));
    await ready();
    const text = await savedSource();
    assert(text.startsWith(preamble));
    assert(text.includes('A -->|"First"| B'));
    assert(text.includes('A -->|"Edited second"| B'));
    assert(text.includes('B named_0@-->|"Third"| C'));
    await page.keyboard.press('Escape');
    await page.locator('g.node').filter({hasText:'Beta'}).dblclick();
    await page.locator('input[name=label]').fill('Edited beta');
    await page.waitForFunction(() => localStorage.getItem('mermaid-source').includes('Edited beta'));
    await ready();
    assert((await savedSource()).startsWith(preamble));
  }
  await set(er);
  await page.getByRole('button',{name:'Format source',exact:true}).click();
  await page.waitForFunction(expected => localStorage.getItem('mermaid-source') === expected, formatted);
  assert(await page.locator('.cm-indent-guide').count() >= 3);
  await page.keyboard.press('ControlOrMeta+z');
  await page.waitForFunction(expected => localStorage.getItem('mermaid-source') === expected, er);
  await page.keyboard.press('Alt+Shift+f');
  await page.waitForFunction(expected => localStorage.getItem('mermaid-source') === expected, formatted);
  assert.deepEqual(errors, []);
  console.log('PASS ELK default and legacy/modern overrides, parallel and named edge editing, preamble preservation, ER/class formatting, guides and Undo');
} finally {
  await browser.close();
}
