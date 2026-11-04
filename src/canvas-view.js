// Keep a manually chosen camera stable when Mermaid recomputes diagram bounds.
// The exported SVG retains its full native viewBox; only on-screen sizing changes.
export function captureManualView(scene,zoom){
 const svg=scene.querySelector('svg'),matrix=svg?.getScreenCTM();if(!matrix)return null;
 const anchor=scene.querySelector('[data-camera-key].selected,[data-camera-key].sequence-selected')||scene.querySelector('[data-camera-key]');
 const rect=anchor?.getBoundingClientRect();return {scale:Math.hypot(matrix.a,matrix.b)/zoom,key:anchor?.dataset.cameraKey,point:rect?{x:rect.x+rect.width/2,y:rect.y+rect.height/2}:null};
}
export function restoreManualView(scene,view){
 if(!view)return null;const svg=scene.querySelector('svg'),box=svg?.viewBox.baseVal;if(!box?.width||!box.height)return null;
 svg.style.setProperty('width',box.width*view.scale+'px','important');svg.style.setProperty('height',box.height*view.scale+'px','important');svg.style.setProperty('max-width','none','important');svg.style.setProperty('max-height','none','important');svg.style.flexShrink='0';
 const anchor=[...scene.querySelectorAll('[data-camera-key]')].find(el=>el.dataset.cameraKey===view.key),rect=anchor?.getBoundingClientRect();
 return rect&&view.point?{x:view.point.x-rect.x-rect.width/2,y:view.point.y-rect.y-rect.height/2}:null;
}
export function resetFittedView(scene){const svg=scene.querySelector('svg');if(!svg)return;for(const property of ['width','height','max-width','max-height','flex-shrink'])svg.style.removeProperty(property);}
