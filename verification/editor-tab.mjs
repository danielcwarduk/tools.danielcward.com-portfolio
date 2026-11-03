import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
try {
 const page=await browser.newPage();
 await page.addInitScript(()=>{localStorage.setItem('mermaid-show-tips','false');localStorage.setItem('mermaid-source','flowchart TD\nA[Alpha]');});
 await page.goto('http://127.0.0.1:5176/mermaid/');
 const content=page.locator('.cm-content');await content.click();await page.keyboard.press('ControlOrMeta+End');await page.keyboard.press('Home');
 const before=await content.innerText();await page.keyboard.press('Tab');
 assert(await content.evaluate(el=>el.contains(document.activeElement)),'Tab moved focus out of editor');
 assert.notEqual(await content.innerText(),before,'Tab did not indent');
 await page.keyboard.press('Shift+Tab');assert.equal(await content.innerText(),before,'Shift+Tab did not restore indentation');
 await page.keyboard.press('ControlOrMeta+a');await page.keyboard.press('Tab');
 assert((await content.innerText()).split('\n').every(line=>/^\s/.test(line)),'Selected lines did not indent');
 await page.keyboard.press('Shift+Tab');assert.equal(await content.innerText(),before);
 console.log('PASS Tab retains editor focus and indents; Shift+Tab unindents; multi-line selection works');
} finally {await browser.close();}
