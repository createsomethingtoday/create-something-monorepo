import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const origin = process.env.AGENCY_BASE_URL || 'http://127.0.0.1:4182';
const evidence = process.env.AGENCY_CONTACT_EVIDENCE || '/tmp/agency-contact-evidence';
const browser = await chromium.launch({ headless: true });
await mkdir(evidence, { recursive: true });
const results = [];
try {
  for (const width of [320,390,768,1024,1025,1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors=[];page.on('pageerror', e=>errors.push(e.message));
    const attempts=[];
    await page.route('**/api/contact', async route => {
      attempts.push({body:route.request().postData(),key:route.request().headers()['idempotency-key']});
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,message:'Test receipt confirmed.'})});
    });
    await page.goto(origin+'/contact?intent=membership&plan=team&source=onboarding-test&campaign=guided-test&lane=workflow_infrastructure');
    const continueButton=page.getByRole('button',{name:'Continue',exact:false});
    await continueButton.waitFor();
    const privacy=page.getByRole('button',{name:'Necessary only',exact:true});if(await privacy.isVisible())await privacy.click();
    assert.equal(await page.locator('input[value="membership"]').isChecked(),true);
    await continueButton.click();
    assert.equal(await page.locator('[data-step="1"] h2').evaluate(e=>e===document.activeElement),true);
    const headingClearance=await page.evaluate(()=>({top:document.querySelector('[data-step="1"] h2').getBoundingClientRect().top,navBottom:document.querySelector('nav[aria-label="Primary"]').getBoundingClientRect().bottom}));
    assert.ok(headingClearance.top>=headingClearance.navBottom,`${width}: focused step heading behind navigation: ${JSON.stringify(headingClearance)}`);
    assert.equal(await page.locator('input[value="team"]').isChecked(),true);
    await continueButton.click();
    assert.equal(await page.locator('[data-step="1"]').isVisible(),true,'empty workflow must not advance');
    await page.getByLabel('What would you like help with?',{exact:true}).fill('Connect our inbox to the project tracker.\nA person approves each update.');
    await continueButton.click();
    await page.getByLabel('Your name',{exact:true}).fill('Test Operator');
    await page.getByLabel('Email',{exact:true}).fill('invalid');
    await page.getByRole('button',{name:'Review your brief'}).click();
    assert.equal(await page.locator('[data-step="2"]').isVisible(),true,'invalid email must not advance');
    await page.getByLabel('Email',{exact:true}).fill('test@example.com');
    await page.getByLabel('Company',{exact:false}).fill('Example');
    await page.getByRole('button',{name:'Review your brief'}).click();
    assert.equal(attempts.length,0,'review must not dispatch');
    assert.match(await page.locator('.review').innerText(),/Team · \$2,500\/month/);
    await page.getByRole('button',{name:'Edit workflow'}).click();
    assert.match(await page.locator('textarea[name=message]').inputValue(),/person approves/);
    await continueButton.click();
    await page.getByRole('button',{name:'Review your brief'}).click();
    await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width} page overflow`);
    await page.waitForFunction(()=>{const e=document.querySelector('.scene');return e.complete&&e.naturalWidth>0;});
    await page.locator('.onboarding').screenshot({path:`${evidence}/review-${width}.png`});
    await page.getByRole('button',{name:'Send membership inquiry'}).click();
    await page.getByText('Test receipt confirmed.',{exact:true}).waitFor();
    assert.equal(attempts.length,1);
    const payload=JSON.parse(attempts[0].body);
    assert.equal(payload.source,'onboarding-test');assert.equal(payload.campaign,'guided-test');assert.equal(payload.intent,'membership');assert.equal(payload.lane,'workflow_infrastructure');assert.match(payload.service,/: Team$/);assert.equal(payload.name,'Test Operator');
    assert.deepEqual(errors,[]);
    results.push({width,passed:true});await page.close();
  }
  // A failed transport freezes the body and navigation; explicit retry reuses both body and ID.
  const page=await browser.newPage({reducedMotion:'reduce'});const attempts=[];
  await page.route('**/api/contact',async route=>{
    attempts.push({body:route.request().postData(),key:route.request().headers()['idempotency-key']});
    if(attempts.length===1) await route.abort();else await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,message:'Retry confirmed.'})});
  });
  await page.goto(origin+'/contact');await page.locator('.actions').waitFor();
  const privacy=page.getByRole('button',{name:'Necessary only',exact:true});if(await privacy.isVisible())await privacy.click();
  await page.getByRole('button',{name:'Continue'}).click();
  await page.locator('textarea[name=message]').fill('A workflow needs review.');
  await page.locator('textarea[name=message]').press('Tab');
  await page.getByRole('button',{name:'Continue'}).click();
  await page.getByLabel('Your name',{exact:true}).fill('Test Operator');await page.getByLabel('Email',{exact:true}).fill('test@example.com');
  await page.getByLabel('Email',{exact:true}).press('Enter');await page.locator('[data-step="3"]:visible').waitFor();assert.equal(attempts.length,0);
  await page.getByRole('button',{name:'Request map',exact:true}).click();
  await page.getByRole('button',{name:'Retry this inquiry'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Edit workflow'}).isDisabled(),true);
  await page.getByRole('button',{name:'Retry this inquiry'}).click();await page.getByText('Retry confirmed.',{exact:true}).waitFor();assert.deepEqual(attempts[0],attempts[1]);await page.close();
  const nojs=await browser.newPage({javaScriptEnabled:false,viewport:{width:320,height:900}});await nojs.goto(origin+'/contact');assert.match(await nojs.locator('noscript').innerText(),/support@createsomething.io/);assert.equal(await nojs.locator('textarea[name=message]').isVisible(),true);assert.equal(await nojs.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await nojs.close();
  console.log(JSON.stringify({passed:true,results,retryAndReducedMotion:true,noJs:true},null,2));
} finally { await browser.close(); }
