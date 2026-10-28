// WKWebView does not reliably present window.confirm. Keep decisions in the app.
let active = false;
export function confirmAction(message, {title='Confirm action',acceptLabel='Continue',cancelLabel='Keep editing',document:doc=globalThis.document}={}) {
  if(active||!doc?.body)return Promise.resolve(false);
  active=true;
  return new Promise(resolve=>{
    const previous=doc.activeElement;
    const backdrop=doc.createElement('div');backdrop.className='record-leave-backdrop';
    const dialog=doc.createElement('section');dialog.className='record-leave-dialog';
    dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','action-confirm-title');dialog.setAttribute('aria-describedby','action-confirm-message');
    const heading=doc.createElement('h2');heading.id='action-confirm-title';heading.textContent=title;
    const description=doc.createElement('p');description.id='action-confirm-message';description.textContent=message;
    const actions=doc.createElement('div');actions.className='inline-actions';
    const cancel=doc.createElement('button');cancel.type='button';cancel.className='btn';cancel.textContent=cancelLabel;
    const accept=doc.createElement('button');accept.type='button';accept.className='btn primary';accept.textContent=acceptLabel;
    actions.append(cancel,accept);dialog.append(heading,description,actions);backdrop.append(dialog);
    const siblings=[...doc.body.children].map(node=>[node,node.inert]);for(const[node]of siblings)node.inert=true;
    let finished=false;
    const finish=result=>{if(finished)return;finished=true;backdrop.remove();for(const[node,inert]of siblings)node.inert=inert;active=false;if(previous?.isConnected)previous.focus();resolve(result);};
    cancel.addEventListener('click',()=>finish(false));accept.addEventListener('click',()=>finish(true));
    backdrop.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();finish(false);}
      if(event.key==='Tab'){event.preventDefault();event.stopPropagation();(doc.activeElement===cancel?accept:cancel).focus();}
    });
    doc.body.append(backdrop);cancel.focus();
  });
}
