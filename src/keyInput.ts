type KeyEvent = Pick<KeyboardEvent,'code'|'key'|'location'>;
const keypad: Record<string,string> = {
  Numpad0:'KP_INS',Numpad1:'KP_END',Numpad2:'KP_DOWNARROW',Numpad3:'KP_PGDN',Numpad4:'KP_LEFTARROW',Numpad5:'KP_5',Numpad6:'KP_RIGHTARROW',Numpad7:'KP_HOME',Numpad8:'KP_UPARROW',Numpad9:'KP_PGUP',
  NumpadDecimal:'KP_DEL',NumpadAdd:'KP_PLUS',NumpadSubtract:'KP_MINUS',NumpadMultiply:'KP_MULTIPLY',NumpadDivide:'KP_SLASH',NumpadEnter:'KP_ENTER',
};
const codes: Record<string,string> = {ShiftLeft:'LSHIFT',ShiftRight:'RSHIFT',ControlLeft:'LCTRL',ControlRight:'RCTRL',AltLeft:'LALT',AltRight:'RALT',Space:'SPACE',Backquote:'`',Minus:'-',Equal:'=',BracketLeft:'[[',BracketRight:']',Semicolon:';',Quote:"'",Comma:',',Period:'.',Slash:'/'};
const special: Record<string,string> = {Enter:'ENTER',Tab:'TAB',Backspace:'BACKSPACE',Delete:'DELETE',Insert:'INS',Home:'HOME',End:'END',PageUp:'PGUP',PageDown:'PGDN',ArrowUp:'UPARROW',ArrowDown:'DOWNARROW',ArrowLeft:'LEFTARROW',ArrowRight:'RIGHTARROW',CapsLock:'CAPSLOCK',NumLock:'NUMLOCK',ScrollLock:'SCROLLLOCK',Pause:'PAUSE',PrintScreen:'PRINTSCREEN'};
export function normalizeKey(event: KeyEvent): string | null {
  if(event.key==='Escape'||event.code==='Escape')return null;
  if(keypad[event.code])return keypad[event.code];
  if(codes[event.code])return codes[event.code];
  if(special[event.key])return special[event.key];
  if(/^Key[A-Z]$/.test(event.code))return event.code.slice(3);
  if(/^Digit[0-9]$/.test(event.code))return event.code.slice(5);
  if(/^F([1-9]|1[0-9]|2[0-4])$/.test(event.key))return event.key.toUpperCase();
  if(/^[a-z0-9]$/i.test(event.key))return event.key.toUpperCase();
  if(event.key===' ')return 'SPACE';
  return null;
}
export function displayKey(value: string): string {
  const normalized=value.toUpperCase();
  const entry=Object.entries(keypad).find(([,key])=>key===normalized);
  if(entry)return entry[0].replace('Numpad','NUMPAD').replace('Decimal','.').replace('Add','+').replace('Subtract','-').replace('Multiply','*').replace('Divide','/').replace('Enter',' ENTER');
  return normalized==='[['?'[':normalized;
}
export function captureKeyInput(target: EventTarget, onPick:(key:string)=>void, onCancel:()=>void) {
  let completed=false;
  const pick=(value:string)=>{if(!completed){completed=true;onPick(value);}};
  const cancel=()=>{if(!completed){completed=true;onCancel();}};
  const block=(event:Event)=>{event.preventDefault();event.stopImmediatePropagation();};
  const key=(event:Event)=>{
    if(completed)return;const e=event as KeyboardEvent;block(e);
    if(e.repeat)return;
    if(e.key==='Escape'||e.code==='Escape'){cancel();return;}
    const value=normalizeKey(e);if(value)pick(value);
  };
  const mouse=(event:Event)=>{if(completed)return;const e=event as MouseEvent;block(e);if(e.button>=0&&e.button<=4)pick(['MOUSE1','MOUSE3','MOUSE2','MOUSE4','MOUSE5'][e.button]);};
  const wheel=(event:Event)=>{if(completed)return;const e=event as WheelEvent;block(e);if(e.deltaY)pick(e.deltaY>0?'MWHEELDOWN':'MWHEELUP');};
  const context=(event:Event)=>block(event);
  target.addEventListener('keydown',key,true);target.addEventListener('mousedown',mouse,true);target.addEventListener('wheel',wheel,{capture:true,passive:false});target.addEventListener('contextmenu',context,true);
  return ()=>{target.removeEventListener('keydown',key,{capture:true});target.removeEventListener('mousedown',mouse,{capture:true});target.removeEventListener('wheel',wheel,{capture:true});target.removeEventListener('contextmenu',context,{capture:true});};
}
