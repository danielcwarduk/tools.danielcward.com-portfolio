import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {diagramTemplates} from '../src/diagram-types.js';

const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
page.setDefaultTimeout(10000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const base = diagramTemplates.find(template => template.id === 'pie').source;
const source = () => page.evaluate(() => localStorage.getItem('mermaid-source'));
const legend = index => page.locator('.legend').nth(index);
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

await legend(0).dblclick();
assert.equal(await page.locator('[name=label]').inputValue(), 'Design');
await page.locator('[name=label]').fill('Discovery');
await page.locator('[name=value]').fill('35');
await saved();
assert((await source()).includes('"Discovery" : 35'));
assert.equal(await legend(0).count(), 1);

await page.keyboard.press('Escape');
await legend(0).click({button: 'right'});
await page.getByRole('button', {name: 'Move later'}).click();
await ready();
assert((await source()).indexOf('"Build"') < (await source()).indexOf('"Discovery"'));

await page.locator('#canvas').focus();
await page.keyboard.press('n');
await ready();
assert((await source()).includes('"Slice 1" : 1'));
await legend(3).click({button: 'right'});
await page.getByRole('button', {name: 'Delete slice'}).click();
await ready();
assert(!(await source()).includes('"Slice 1"'));
await page.keyboard.press('Control+z');
await ready();
assert((await source()).includes('"Slice 1"'));

await page.locator('#export').click();
await page.locator('[name=format]').selectOption('svg');
const download = page.waitForEvent('download');
await page.locator('.export-dialog [type=submit]').click();
const file = await download;
assert((await fs.readFile(await file.path(), 'utf8')).includes('pieCircle'));

const unsupported = 'pie\n"Known" : 10\n"Known" : 5\n';
await set(unsupported, false);
assert.equal(await source(), unsupported);
await page.locator('#canvas').focus();
await page.keyboard.press('n');
assert.equal(await source(), unsupported);
assert.equal(await page.locator('.legend').count(), 1);
assert.deepEqual(errors, []);
await browser.close();
console.log('PASS pie visual editing, history, fallback and export');
