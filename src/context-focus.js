export function focusContextField(root, field = 'label') {
  if(field==='shape'&&root.dataset.editorKey?.startsWith('node:')&&root.querySelector('.compact-shapes')&&!root.querySelector('.compact-shapes [aria-pressed="true"]')){const more=root.querySelector('[aria-label="More shapes"]');if(more&&!more.hidden)more.click();}
  const choices = {
    shape: ['[data-context-field="shape"]', '.compact-shapes button[aria-pressed="true"]', '.connection-types button[aria-pressed="true"]', '.compact-shapes button', '.connection-types button'],
    colour: ['.colour-swatch[aria-pressed="true"]', '.colour-swatch'],
    id: ['input[name="id"]'],
    label: ['input[name="label"]', '[name="edge-label"]'],
  };
  const target = (choices[field] || choices.label).map(selector => root.querySelector(selector)).find(Boolean)
    || root.querySelector('input[name="label"],[name="edge-label"],button');
  if (!target) return;
  root.dataset.focusField = field;
  target.focus();
  if (target.matches('input:not([type=range]),textarea')) target.select();
}

export function bindContextShortcuts(root) {
  root.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.isComposing) return;
    const text = event.target.closest('input,textarea,[contenteditable=true]');
    if (text && event.key !== 'F2') return;
    const grid = event.target.closest('.compact-shapes,.colour-swatches,.connection-types');
    const step = {ArrowLeft: -1, ArrowRight: 1, ArrowUp: -(grid?.classList.contains('colour-swatches') ? 5 : grid?.classList.contains('connection-types') ? 3 : 4), ArrowDown: grid?.classList.contains('colour-swatches') ? 5 : grid?.classList.contains('connection-types') ? 3 : 4}[event.key];
    if (grid && step) {
      const buttons = [...grid.querySelectorAll('button:not(:disabled)')];
      const index = buttons.indexOf(event.target.closest('button'));
      if (index >= 0) { event.preventDefault(); event.stopPropagation(); buttons[Math.max(0, Math.min(buttons.length-1, index+step))].focus(); }
      return;
    }
    const field = event.key === 'F2' ? 'id' : {r:'shape',f:'colour',e:'label'}[event.key.toLowerCase()];
    if (field) { event.preventDefault(); event.stopPropagation(); focusContextField(root, field); }
  });
}
