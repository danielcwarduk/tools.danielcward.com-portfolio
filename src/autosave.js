export function createDebouncedSave({ready,blocked,save,onState,delay=250}){
 let timer=null;const editor={state:'saved',dirty:false,get pending(){return timer!==null||this.state==='saving';},change(){clearTimeout(timer);this.dirty=true;state('saving');timer=setTimeout(attempt,delay);},cancel(){clearTimeout(timer);timer=null;this.dirty=false;state('saved');},flush(){clearTimeout(timer);timer=null;if(this.dirty)attempt();}};
 function state(value,error=''){editor.state=value;onState(value,error);}
 function attempt(){timer=null;if(!editor.dirty)return;if(!ready()){const reason=blocked();if(reason){state('invalid',reason);return;}timer=setTimeout(attempt,35);return;}try{save();editor.dirty=false;state('saved');}catch(e){state('invalid',e.message||String(e));}}
 return editor;
}
