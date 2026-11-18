import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {diagramTemplates} from '../src/diagram-types.js';

const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
page.setDefaultTimeout(10000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const base = diagramTemplates.find(template => template.id === 'state').source;
const source = () => page.evaluate(() => localStorage.getItem('mermaid-source'));
const state = id => page.locator(`[data-state-node="${id}"]`);
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

assert.equal(await state('Ready').count(), 1);
assert.equal(await page.locator('[data-state-transition]').count(), 13); // original paths, hit paths, labels, and pseudo endpoints are all mapped
assert.equal(await page.locator('.node.default[id*="-state-root_end-"][data-state-transition]').count(), 1);
await state('Ready').focus();
await page.keyboard.press('Space');
assert.equal(await state('Ready').getAttribute('aria-pressed'), 'true');
await state('Ready').evaluate(el => getComputedStyle(el.querySelector('.basic')).stroke);
await page.keyboard.press('Enter');
assert.equal(await page.locator('[name=id]').inputValue(), 'Ready');
await page.locator('[name=id]').fill('Idle');
await saved();
assert((await source()).includes('Idle --> Working: Start'));
assert.equal(await state('Idle').count(), 1);

await page.keyboard.press('Escape');
const transitionLabel = page.locator('.edgeLabel[data-state-transition="2"]');
await transitionLabel.focus();
await page.keyboard.press('Enter');
assert.equal(await page.locator('[name=label]').inputValue(), 'Finish');
await page.locator('[name=label]').fill('Complete');
await saved();
assert((await source()).includes('Working --> Idle: Complete'));

await page.locator('#canvas').focus();
await page.keyboard.press('n');
await ready();
assert((await source()).includes('state State1'));
await page.keyboard.press('c');
await ready();
assert((await source()).includes('State1 -->'));
await page.keyboard.press('Control+z');
await ready();
assert(!(await source()).includes('State1 -->'));

await page.locator('#export').click();
await page.locator('[name=format]').selectOption('svg');
const download = page.waitForEvent('download');
await page.locator('.export-dialog [type=submit]').click();
const file = await download;
assert((await fs.readFile(await file.path(), 'utf8')).includes('stateGroup'));

const unsupported = 'stateDiagram-v2\n    state Parent {\n        Ready --> Working\n    }\n';
await set(unsupported, false);
assert.equal(await source(), unsupported);
await page.locator('#canvas').focus();
await page.keyboard.press('n');
assert.equal(await source(), unsupported);
assert.equal(await page.locator('#scene svg').count(), 1);
assert.deepEqual(errors, []);
await browser.close();
console.log('PASS state visual editing, end matching, selection, history, fallback and export');
