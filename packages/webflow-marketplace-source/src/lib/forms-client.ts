/** Retain Webflow's published form delivery; never send from a development preview. */
export function initForms(){
 const dev=import.meta.env.DEV;
 document.querySelectorAll<HTMLFormElement>('form[data-source-owned-form]').forEach(form=>{
  const note=document.createElement('p');note.setAttribute('role','status');form.append(note);
  if(dev)note.textContent='Development mode: validation is available; delivery is disabled.';
  form.addEventListener('submit',event=>{
   if(dev){event.preventDefault();event.stopImmediatePropagation();note.textContent='Development mode: your form has not been sent.';return;}
   if(form.id==='wf-form-Marketplace-Creator-Invitation'&&document.querySelector<HTMLInputElement>('#Creator-Check-Success')?.checked!==true){event.preventDefault();event.stopImmediatePropagation();note.textContent='Verify your current email before requesting an invitation.';}
  },true);
 });
 const email=document.querySelector<HTMLInputElement>('#Primary-Email');const button=document.querySelector<HTMLElement>('#Check-Database-Email');const verified=document.querySelector<HTMLInputElement>('#Creator-Check-Success');const error=document.querySelector<HTMLElement>('#Creator-Error');const success=document.querySelector<HTMLElement>('#Creator-Success');
 if(!email||!button||!verified||!error||!success)return;
 error.style.display='none';success.style.display='none';let generation=0;
 email.addEventListener('input',()=>{generation++;verified.checked=false;success.style.display='none';error.style.display='none'});
 button.setAttribute('role','button');button.tabIndex=0;
 const check=async(event:Event)=>{
  event.preventDefault();if(!email.reportValidity())return;
  const value=email.value.trim();const current=++generation;verified.checked=false;success.style.display='none';error.style.display='block';
  if(dev){error.textContent='Development preview: creator verification and Slack invitation delivery are disabled.';return;}
  error.textContent='Checking creator email…';button.setAttribute('aria-disabled','true');
  try{const response=await fetch('https://check-asset-name.mcp.createsomething.agency/api/checkTemplateemail',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:value}),signal:AbortSignal.timeout(15000)});const result=await response.json();if(current!==generation||email.value.trim()!==value)return;
   if(!response.ok)throw new Error('Verification unavailable');
   if(result.emailExists===true){verified.checked=true;error.style.display='none';success.textContent='Creator email verified. You can request an invitation.';success.style.display='block'}else error.textContent='This email is not registered as a Template Creator.';
  }catch{if(current===generation)error.textContent='Verification could not be completed. Please try again later.'}finally{button.removeAttribute('aria-disabled')}
 };
 button.addEventListener('click',check);button.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){void check(event)}});
}
