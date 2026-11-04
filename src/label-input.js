// A single-line control can retain pre-existing multiline labels without loss.
export const labelInputValue=text=>String(text).replaceAll('\\','\\\\').replaceAll('\n','\\n').replaceAll('\r','\\r');
export const labelFromInput=text=>String(text).replace(/\\([\\nr])/g,(_,char)=>char==='n'?'\n':char==='r'?'\r':'\\');
