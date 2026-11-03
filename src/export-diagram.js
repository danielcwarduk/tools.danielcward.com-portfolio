const ns='http://www.w3.org/2000/svg';
let fontData;
const dataUrl=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not read an export asset.'));reader.readAsDataURL(blob);});
async function interFont(){if(!fontData)fontData=fetch('/fonts/inter-latin.woff2').then(r=>{if(!r.ok)throw Error('Could not load the diagram font.');return r.blob();}).then(dataUrl).catch(e=>{fontData=null;throw e;});return fontData;}
const segments=text=>typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)]:[...text].map((segment,index,all)=>({segment,index:all.slice(0,index).join('').length}));

// HTML labels cannot be reliably rasterised from an SVG image. Convert the actual
// rendered text into SVG text runs, retaining line wrapping, position and styling.
function vectorLabel(original){
 const group=document.createElementNS(ns,'g');
 if(original.hasAttribute('transform'))group.setAttribute('transform',original.getAttribute('transform'));
 const inverse=original.getScreenCTM()?.inverse();if(!inverse)return group;
 const measure=document.createElement('canvas').getContext('2d');
 const walker=document.createTreeWalker(original,NodeFilter.SHOW_TEXT);const runs=[];let node;
 while(node=walker.nextNode()){
  if(!node.textContent||node.parentElement.closest('script,style'))continue;
  const style=getComputedStyle(node.parentElement),font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  measure.font=font;const metrics=measure.measureText('Hg'),ascent=metrics.fontBoundingBoxAscent||parseFloat(style.fontSize)*.8;
  const key=[font,style.color,style.letterSpacing].join('|');
  for(const item of segments(node.textContent)){
   const range=document.createRange();range.setStart(node,item.index);range.setEnd(node,item.index+item.segment.length);const rect=range.getBoundingClientRect();
   if(!rect.height||(/^\s+$/u.test(item.segment)&&!rect.width))continue;const glyph=/[\n\r\t]/.test(item.segment)?' ':item.segment;
   const a=new DOMPoint(rect.left,rect.top).matrixTransform(inverse),b=new DOMPoint(rect.right,rect.bottom).matrixTransform(inverse),baseline=a.y+ascent;
   const last=runs.at(-1);
   if(last&&last.key===key&&Math.abs(last.y-baseline)<.5){last.text+=glyph;last.x=Math.min(last.x,a.x);last.right=Math.max(last.right,b.x);}
   else runs.push({key,text:glyph,x:a.x,right:b.x,y:baseline,font,fill:style.color,letterSpacing:style.letterSpacing});
  }
 }
 for(const run of runs){if(!run.text.trim())continue;const text=document.createElementNS(ns,'text');text.setAttribute('x',run.x);text.setAttribute('y',run.y);text.setAttribute('xml:space','preserve');text.style.setProperty('font',run.font,'important');text.style.setProperty('fill',run.fill,'important');text.style.setProperty('stroke','none','important');text.style.setProperty('text-anchor','start','important');text.style.setProperty('white-space','pre','important');if(run.letterSpacing!=='normal')text.style.letterSpacing=run.letterSpacing;if(run.right>run.x){text.setAttribute('textLength',run.right-run.x);text.setAttribute('lengthAdjust','spacingAndGlyphs');}text.textContent=run.text;group.append(text);}
 return group;
}

export async function diagramSvg(svg){
 if(!svg)throw Error('Render a diagram before exporting.');
 await document.fonts.ready;
 const clone=svg.cloneNode(true),originals=[...svg.querySelectorAll('foreignObject')],copies=[...clone.querySelectorAll('foreignObject')];
 originals.forEach((element,index)=>copies[index].replaceWith(vectorLabel(element)));
 clone.querySelectorAll('.connection-hit').forEach(e=>e.remove());
 clone.querySelectorAll('.selected,.selected-edge,.selected-group,.connection-source,.drop-target').forEach(e=>e.classList.remove('selected','selected-edge','selected-group','connection-source','drop-target'));
 let view=svg.viewBox.baseVal;if(!view.width||!view.height)view=svg.getBBox();
 const width=Math.max(1,Math.ceil(view.width)),height=Math.max(1,Math.ceil(view.height));
 clone.setAttribute('xmlns',ns);clone.setAttribute('viewBox',`${view.x} ${view.y} ${view.width} ${view.height}`);clone.setAttribute('width',width);clone.setAttribute('height',height);clone.style.removeProperty('max-width');clone.style.removeProperty('width');clone.style.removeProperty('height');clone.style.background='transparent';
 const style=document.createElementNS(ns,'style');style.textContent=`@font-face{font-family:Inter;src:url("${await interFont()}") format("woff2");font-style:normal;font-weight:100 900}.edgeLabel rect,.edgeLabel .labelBkg{fill:transparent!important}.flowchart-link{stroke-width:2.5px!important}.flowchart-link.edge-thickness-thick{stroke-width:4px!important}`;clone.prepend(style);
 for(const image of clone.querySelectorAll('image')){const href=image.getAttribute('href')||image.getAttributeNS('http://www.w3.org/1999/xlink','href');if(href&&!href.startsWith('data:')&&!href.startsWith('#')){const response=await fetch(new URL(href,location.href),{credentials:'omit'});if(!response.ok)throw Error('Could not load an image used in the diagram.');const data=await dataUrl(await response.blob());image.setAttribute('href',data);image.removeAttributeNS('http://www.w3.org/1999/xlink','href');}}
 return {blob:new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml;charset=utf-8'}),width,height};
}

export async function diagramPng(svg,{background=null}={}){
 const vector=await diagramSvg(svg),scale=Math.min(2,8192/vector.width,8192/vector.height,Math.sqrt(32000000/(vector.width*vector.height)));
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(vector.width*scale));canvas.height=Math.max(1,Math.round(vector.height*scale));const context=canvas.getContext('2d');if(!context)throw Error('Image export is unavailable in this browser.');
 if(background){context.fillStyle=background;context.fillRect(0,0,canvas.width,canvas.height);}
 const url=URL.createObjectURL(vector.blob);
 try{const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Could not render the exported diagram image.'));image.src=url;});context.drawImage(image,0,0,canvas.width,canvas.height);return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Could not create the PNG file.')),'image/png'));}
 finally{URL.revokeObjectURL(url);}
}

export function downloadBlob(blob,name){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
