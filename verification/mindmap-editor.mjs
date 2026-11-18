import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {diagramTemplates} from '../src/diagram-types.js';

const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
page.setDefaultTimeout(10000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const base = diagramTemplates.find(template => template.id === 'mindmap').source;
const source = () => page.evaluate(() => localStorage.getItem('mermaid-source'));
const node = key => page.locator(`[data-mindmap-node="${key}"]`);
async function ready(editable = true) {
  await page.waitForFunction(expected => document.querySelector('#canvas')?.dataset.editable === String(expected) && !document.querySelector('#export').disabled, editable);
}
async function set(text, editable = true) {
  await page.locator('.cm-content').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText(text);
  await ready(editable);
}
async function saved() {
  await page.waitForFunction(() => document.querySelector('#menu .context-editor')?.dataset.saveState === 'saved' && document.querySelector('#canvas').dataset.editable === 'true');
}

await page.addInitScript(text => {
  localStorage.setItem('mermaid-show-tips', 'false');
  localStorage.setItem('mermaid-source', text);
}, base);
await page.goto(process.env.SITE_URL || 'http://127.0.0.1:5176/mermaid/');
await ready();

assert.equal(await page.locator('g.node.mindmap-node[data-mindmap-node]').count(), 7);
await node('mindmap-0').focus();
await page.keyboard.press('Space');
assert.equal(await node('mindmap-0').getAttribute('aria-pressed'), 'true');
await page.keyboard.press('n');
await ready();
assert((await source()).includes('Branch 1'));
assert.equal(await page.locator('g.node.mindmap-node[data-mindmap-node]').count(), 8);

await node('mindmap-7').focus();
await page.keyboard.press('Enter');
assert.equal(await page.locator('[name=label]').inputValue(), 'Branch 1');
await page.locator('[name=label]').fill('Strategy');
await saved();
assert((await source()).includes('        Strategy\n'));

// Moving Ideas must keep both child branches and their tree order.
await page.keyboard.press('Escape');
await node('mindmap-1').focus();
await page.keyboard.press('Enter');
await page.locator('[name=parent]').selectOption('mindmap-4');
await saved();
assert.match(await source(), /Delivery\n            Build\n            Review\n            Ideas\n                Research\n                Sketch\n/);
assert.equal(await page.locator('#selection').textContent(), 'No mind map branch selected');

// Delete Ideas recursively, then prove source history restores and reapplies it.
await page.locator('g.node.mindmap-node').filter({hasText: 'Ideas'}).focus();
await page.keyboard.press('Enter');
await page.getByRole('button', {name: 'Delete branch and descendants'}).click();
await ready();
assert(!(await source()).includes('Ideas'));
assert(!(await source()).includes('Research'));
await page.locator('#canvas').focus();
await page.keyboard.press('Control+z');
await ready();
assert((await source()).includes('Ideas'));
await page.locator('#canvas').focus();
await page.keyboard.press('Control+y');
await ready();
assert(!(await source()).includes('Ideas'));

await page.locator('#export').click();
await page.locator('[name=format]').selectOption('svg');
const download = page.waitForEvent('download');
await page.locator('.export-dialog [type=submit]').click();
const file = await download;
assert((await fs.readFile(await file.path(), 'utf8')).includes('mindmapDiagram'));

const unsupported = 'mindmap\n    root((Project))\n        Ideas[branch]\n';
await set(unsupported, false);
assert.equal(await source(), unsupported);
await page.locator('#canvas').focus();
await page.keyboard.press('n');
assert.equal(await source(), unsupported);
assert.equal(await page.locator('#scene svg').count(), 1);
assert.deepEqual(errors, []);
await browser.close();
console.log('PASS mind map visual editing, reparent, descendants, history, fallback and export');
