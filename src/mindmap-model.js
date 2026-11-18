import {splitPreamble} from './source-preamble.js';

function fail(message) { throw new Error(message); }
const plainLabel = /^[^()\[\]{}<>"'`\n\r]+$/;

function visit(node, fn) { fn(node); for (const child of node.children) visit(child, fn); }
function flatten(root) { const nodes = []; visit(root, node => nodes.push(node)); return nodes; }
function validate(model) {
  if (!model.root) fail('A mind map needs one root.');
  const keys = new Set();
  visit(model.root, node => {
    if (!node.key || keys.has(node.key)) fail('Mind map nodes must have unique identities.');
    keys.add(node.key);
    if (typeof node.label !== 'string' || !node.label.trim() || !plainLabel.test(node.label)) fail('Use a non-empty plain text label without Mermaid shape syntax.');
  });
}

export function parseMindmap(source) {
  const model = {preamble: '', header: null, headerRaw: null, rootIndent: 0, root: null, nextId: 0, error: null};
  try {
    const split = splitPreamble(source);
    model.preamble = split.preamble;
    const lines = split.body.split(/\r?\n/);
    const header = lines.shift();
    if (!/^mindmap\s*$/.test(header || '')) fail('Visual mind map editing requires a plain mindmap header. Edit source directly.');
    model.headerRaw = header;
    let stack = [];
    for (const [index, raw] of lines.entries()) {
      if (!raw.trim()) {
        if (lines.slice(index + 1).some(line => line.trim())) fail(`Line ${index + 2} contains a blank row inside the tree. Edit source directly.`);
        continue;
      }
      if (/\t/.test(raw)) fail(`Line ${index + 2} uses tabs for indentation. Edit source directly.`);
      const spaces = raw.match(/^ */)[0].length;
      const text = raw.slice(spaces);
      if (!model.root) {
        const root = text.match(/^root\(\(([^()]*)\)\)$/);
        if (!root) fail(`Line ${index + 2} must be a plain root((label)) node.`);
        model.rootIndent = spaces;
        model.root = {key: 'mindmap-0', label: root[1], raw, depth: 0, children: []};
        stack = [model.root];
        model.nextId = 1;
        continue;
      }
      const depth = (spaces - model.rootIndent) / 4;
      if (!Number.isInteger(depth) || depth < 1) fail(`Line ${index + 2} must be indented in four-space levels below the root.`);
      if (text.startsWith('%%') || text.startsWith('accTitle') || text.startsWith('accDescr')) fail(`Line ${index + 2} uses an unsupported directive. Edit source directly.`);
      if (!plainLabel.test(text) || !text.trim() || /^(?:root\b|.*(?:\(\(|\[\[|\{\{|-->|::))/.test(text)) fail(`Line ${index + 2} uses a shape or node syntax outside the visual editor subset.`);
      const parent = stack[depth - 1];
      if (!parent) fail(`Line ${index + 2} skips a parent level.`);
      const node = {key: `mindmap-${model.nextId++}`, label: text.trim(), raw, depth, children: []};
      parent.children.push(node);
      stack[depth] = node;
      stack.length = depth + 1;
    }
    if (!model.root) fail('Add a root((label)) node to enable visual editing.');
    model.header = 'mindmap';
    validate(model);
  } catch (error) { model.error = error.message; }
  return model;
}

export function serializeMindmap(model) {
  validate(model);
  const rows = [model.headerRaw ?? 'mindmap'];
  function emit(node, depth) {
    const indentation = model.rootIndent + depth * 4;
    const rawIndent = node.raw?.match(/^ */)[0].length;
    const raw = node.raw !== undefined && rawIndent === indentation && (depth ? node.raw.slice(rawIndent).trim() === node.label : node.raw.slice(rawIndent).match(/^root\(\(([^()]*)\)\)$/)?.[1] === node.label);
    rows.push(raw ? node.raw : ' '.repeat(indentation) + (depth ? node.label : `root((${node.label}))`));
    for (const child of node.children) emit(child, depth + 1);
  }
  emit(model.root, 0);
  return model.preamble + rows.join('\n') + '\n';
}

function locate(model, key) {
  let found = null;
  function walk(node, parent = null) {
    if (node.key === key) found = {node, parent};
    for (const child of node.children) walk(child, node);
  }
  walk(model.root);
  if (!found) fail('This mind map branch no longer exists.');
  return found;
}

export function updateMindmapNode(model, key, patch) {
  const {node, parent: currentParent} = locate(model, key);
  if (patch.label !== undefined) {
    if (typeof patch.label !== 'string' || !patch.label.trim() || !plainLabel.test(patch.label)) fail('Use a non-empty plain text label without Mermaid shape syntax.');
    node.label = patch.label.trim();
  }
  if (patch.parent !== undefined && patch.parent !== currentParent?.key) {
    const {node: target} = locate(model, patch.parent);
    if (node === model.root) fail('The mind map root cannot be reparented.');
    let descendant = false;
    visit(node, child => { if (child.key === target.key) descendant = true; });
    if (descendant) fail('A branch cannot be moved beneath itself or one of its descendants.');
    currentParent.children.splice(currentParent.children.indexOf(node), 1);
    target.children.push(node);
    function invalidateRaw(item, depth) { item.depth = depth; delete item.raw; for (const child of item.children) invalidateRaw(child, depth + 1); }
    const targetDepth = flatten(model.root).find(item => item.key === target.key).depth;
    invalidateRaw(node, targetDepth + 1);
  }
  validate(model);
}

export function addMindmapNode(model, parentKey) {
  const {node: parent} = locate(model, parentKey);
  const labels = new Set(flatten(model.root).map(item => item.label));
  let index = 1;
  while (labels.has(`Branch ${index}`)) index++;
  const node = {key: `mindmap-${model.nextId++}`, label: `Branch ${index}`, raw: undefined, depth: 0, children: []};
  parent.children.push(node);
  node.depth = flatten(model.root).find(item => item.key === parentKey).depth + 1;
  validate(model);
  return node.key;
}

export function removeMindmapNode(model, key) {
  if (model.root.key === key) fail('The mind map root cannot be deleted.');
  const {node, parent} = locate(model, key);
  parent.children.splice(parent.children.indexOf(node), 1);
  validate(model);
}

export function mindmapNodes(model) { return flatten(model.root).map(node => ({key: node.key, label: node.label, depth: node.depth})); }
