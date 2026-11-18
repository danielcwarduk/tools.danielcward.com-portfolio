import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {diagramTemplates} from '../src/diagram-types.js';

const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
page.setDefaultTimeout(10000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const base = diagramTemplates.find(template => template.id === 'class').source;
const source = () => page.evaluate(() => localStorage.getItem('mermaid-source'));
const classNode = id => page.locator(`[data-class-node="${id}"]`);
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

assert.equal(await page.locator('g.node[data-class-node]').count(), 2);
await classNode('User').focus();
await page.keyboard.press('Space');
assert.equal(await classNode('User').getAttribute('aria-pressed'), 'true');
await page.keyboard.press('Enter');
assert.equal(await page.locator('[name=id]').inputValue(), 'User');
assert.equal(await page.locator('[name=attributes]').inputValue(), '+String name');
assert.equal(await page.locator('[name=methods]').inputValue(), '+signIn()');

await page.locator('[name=id]').fill('Customer');
await page.locator('[name=attributes]').fill('+String displayName\n-age: Int');
await page.locator('[name=methods]').fill('+signIn(token: String)\n#reset()');
await saved();
assert((await source()).includes('class Customer'));
assert((await source()).includes('Customer --> Account: owns'));
assert(!(await source()).includes('User --> Account'));
assert.equal(await classNode('Customer').count(), 1);

await page.locator('#canvas').focus();
await page.keyboard.press('n');
await ready();
assert((await source()).includes('class Class1'));
assert.equal(await classNode('Class1').count(), 1);
await classNode('Class1').focus();
await page.keyboard.press('Enter');
await page.locator('[name=id]').fill('Session');
await page.locator('[name=attributes]').fill('+String token');
await page.locator('[name=methods]').fill('+close()');
await saved();
assert((await source()).includes('class Session {'));

await page.locator('#canvas').focus();
await page.keyboard.press('c');
assert.equal(await page.locator('[name=from]').inputValue(), 'Session');
assert.equal(await page.locator('[name=to]').inputValue(), 'Customer');
await page.locator('[name=operator]').selectOption('..|>');
await page.locator('[name=label]').fill('implements');
await page.getByRole('button', {name: 'Add relationship'}).click();
await ready();
assert((await source()).includes('Session ..|> Customer: implements'));
assert.equal(await page.locator('path.relation[data-class-relationship]').count(), 2);

await page.locator('path.relation[data-class-relationship="1"]').focus();
await page.keyboard.press('Enter');
await page.locator('[name=operator]').selectOption('--|>');
await page.locator('[name=label]').fill('manages');
await saved();
assert((await source()).includes('Session --|> Customer: manages'));
await page.getByRole('button', {name: 'Move earlier'}).click();
await ready();
assert((await source()).indexOf('Session --|> Customer') < (await source()).indexOf('Customer --> Account'));
await page.locator('path.relation[data-class-relationship="0"]').focus();
await page.keyboard.press('Enter');
await page.getByRole('button', {name: 'Delete relationship'}).click();
await ready();
assert(!(await source()).includes('Session --|> Customer'));
await page.locator('#canvas').focus();
await page.keyboard.press('Control+z');
await ready();
assert((await source()).includes('Session --|> Customer'));
await page.locator('#canvas').focus();
await page.keyboard.press('Control+y');
await ready();
assert(!(await source()).includes('Session --|> Customer'));

await page.keyboard.press('Escape');
await classNode('Customer').focus();
await page.keyboard.press('Enter');
await page.getByRole('button', {name: 'Delete class'}).click();
await ready();
assert(!(await source()).includes('class Customer'));
assert(!(await source()).includes('Customer --> Account: owns'));
assert.equal(await classNode('Account').count(), 1);

await page.locator('#canvas').focus();
await page.keyboard.press('Control+z');
await ready();
assert((await source()).includes('class Customer'));
await page.locator('#canvas').focus();
await page.keyboard.press('Control+y');
await ready();
assert(!(await source()).includes('class Customer'));

await page.locator('#export').click();
await page.locator('[name=format]').selectOption('svg');
const download = page.waitForEvent('download');
await page.locator('.export-dialog [type=submit]').click();
const file = await download;
assert((await fs.readFile(await file.path(), 'utf8')).includes('classDiagram'));

const operators = ['<|--','--|>','*--','--*','o--','--o','-->','<--','--','..>','<..','..|>','<|..','..'];
const allRelations = 'classDiagram\nclass A\nclass B\n' + operators.map((operator, index) => `A ${operator} B: R${index}\n`).join('');
await set(allRelations);
assert.equal(await page.locator('path.relation[data-class-relationship]').count(), operators.length);
assert.equal(await page.locator('#canvas').getAttribute('data-editable'), 'true');

const unsupported = 'classDiagram\nclass A\nclass B\nA "1" --> "*" B: cardinality\n';
await set(unsupported, false);
assert.equal(await source(), unsupported);
await page.locator('#canvas').focus();
await page.keyboard.press('n');
assert.equal(await source(), unsupported);
assert.equal(await page.locator('#scene svg').count(), 1);
assert.deepEqual(errors, []);
await browser.close();
console.log('PASS class visual editing, raw relationships, history, fallback and export');
